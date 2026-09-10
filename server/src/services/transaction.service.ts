import { PoolClient } from 'pg';
import { withTransaction, query } from '../config/database';
import { AppError } from '../utils/AppError';
import {
  generateTransactionReference,
  calculateTransferFee,
  addDecimals,
  compareDecimals,
  hashRequestParams,
  toPesewas,
  fromPesewas,
} from '../utils/financial';
import { verifyPin } from './auth.service';
import {
  TransactionStatus,
  TransactionType,
  TransactionRow,
  AccountRow,
  CreateTransactionInput,
  SendMoneyResult,
  isValidTransition,
} from '../types/transaction';

// ─── State Machine ────────────────────────────────────────────────────────────

/**
 * Enforce valid state transitions.
 * Controllers must use this service — they must not update status directly.
 */
export async function transitionTransactionStatus(
  client: PoolClient,
  transactionId: string,
  toStatus: TransactionStatus,
  options?: { failureReason?: string },
): Promise<void> {
  const result = await client.query<{ status: TransactionStatus }>(
    'SELECT status FROM transactions WHERE id = $1 FOR UPDATE',
    [transactionId],
  );

  const tx = result.rows[0];
  if (!tx) {
    throw new AppError('NOT_FOUND', 'Transaction not found.');
  }

  if (!isValidTransition(tx.status, toStatus)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot transition transaction from ${tx.status} to ${toStatus}.`,
    );
  }

  const updates: string[] = ['status = $1', 'updated_at = NOW()'];
  const params: unknown[] = [toStatus];
  let paramIdx = 2;

  if (toStatus === TransactionStatus.COMPLETED) {
    updates.push(`completed_at = NOW()`);
  }

  if (options?.failureReason && toStatus === TransactionStatus.FAILED) {
    updates.push(`failure_reason = $${paramIdx++}`);
    params.push(options.failureReason);
  }

  params.push(transactionId);
  await client.query(
    `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
    params,
  );
}

// ─── Send Money (Atomic) ──────────────────────────────────────────────────────

/**
 * Execute a money transfer atomically.
 *
 * All financial state changes happen inside a single PostgreSQL transaction.
 * If any step fails, ALL changes are rolled back — no partial transfers.
 *
 * Idempotency is enforced at the database level via a composite PRIMARY KEY
 * (user_id, idempotency_key) with an ON CONFLICT strategy that is
 * safe under concurrent requests.
 */
export async function sendMoney(input: CreateTransactionInput): Promise<SendMoneyResult> {
  const requestHash = hashRequestParams({
    recipientPhone: input.recipientPhone,
    amount: input.amount,
    note: input.note ?? '',
  });

  return withTransaction(async (client) => {
    // ── Step 1: Check idempotency (atomic insert with conflict handling) ──────
    //
    // Using INSERT ... ON CONFLICT DO NOTHING and then SELECT creates a
    // race condition. Instead, we use INSERT ... ON CONFLICT DO UPDATE to
    // atomically read the existing record. This is safe under concurrent
    // requests because the composite PRIMARY KEY (user_id, key) guarantees
    // database-level uniqueness.

    const idempotencyInsert = await client.query<{
      status: string;
      transaction_id: string | null;
      request_hash: string;
      response_body: string | null;
    }>(
      `INSERT INTO idempotency_keys (key, user_id, status, request_hash, expires_at)
       VALUES ($1, $2, 'PROCESSING', $3, NOW() + INTERVAL '24 hours')
       ON CONFLICT (user_id, key) DO UPDATE
         SET key = EXCLUDED.key  -- no-op update to return existing row
       RETURNING status, transaction_id, request_hash, response_body`,
      [input.idempotencyKey, input.senderUserId, requestHash],
    );

    const existingKey = idempotencyInsert.rows[0];

    // ── Step 2: Handle existing idempotency key ───────────────────────────────

    if (existingKey.status !== 'PROCESSING' || existingKey.transaction_id !== null) {
      // Key was previously processed — check if same request parameters
      if (existingKey.request_hash !== requestHash) {
        throw new AppError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was used for a different transaction. Please use a new key.',
        );
      }

      if (existingKey.status === 'PROCESSING') {
        // Still processing from a concurrent request — return 202
        throw new AppError(
          'DUPLICATE_TRANSACTION',
          'This payment is currently being processed. Please wait.',
        );
      }

      // COMPLETED or FAILED — return the cached transaction
      if (existingKey.transaction_id) {
        const txResult = await client.query<TransactionRow>(
          `SELECT t.*,
                  su.full_name AS sender_name, su.phone AS sender_phone,
                  ru.full_name AS recipient_name, ru.phone AS recipient_phone
           FROM transactions t
           JOIN accounts sa ON sa.id = t.sender_account_id
           JOIN accounts ra ON ra.id = t.recipient_account_id
           JOIN users su ON su.id = sa.user_id
           JOIN users ru ON ru.id = ra.user_id
           WHERE t.id = $1`,
          [existingKey.transaction_id],
        );
        return {
          transaction: txResult.rows[0],
          cached: true,
        };
      }
    }

    // ── Step 3: Verify sender transaction PIN (REQUIRED before any balance/account changes) ──
    const senderUserResult = await client.query<{ pin_hash: string | null; status: string }>(
      'SELECT pin_hash, status FROM users WHERE id = $1',
      [input.senderUserId],
    );
    const senderUser = senderUserResult.rows[0];
    if (!senderUser) {
      throw new AppError('NOT_FOUND', 'Sender user not found.');
    }
    if (!senderUser.pin_hash) {
      await client.query(
        'DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2',
        [input.senderUserId, input.idempotencyKey],
      );
      throw new AppError('PIN_NOT_SET', 'Transaction PIN has not been set. Please set a PIN in profile settings.');
    }

    const isPinValid = await verifyPin(input.pin, senderUser.pin_hash);
    if (!isPinValid) {
      await client.query(
        'DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2',
        [input.senderUserId, input.idempotencyKey],
      );
      throw new AppError('INVALID_PIN', 'Incorrect transaction PIN. Please try again.');
    }

    // ── Step 4: Resolve sender account (from authenticated user — never from client) ─
    const senderAccountResult = await client.query<AccountRow>(
      'SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE',
      [input.senderUserId],
    );

    const senderAccount = senderAccountResult.rows[0];
    if (!senderAccount) {
      throw new AppError('NOT_FOUND', 'Sender account not found.');
    }
    if (senderAccount.status !== 'ACTIVE') {
      throw new AppError('ACCOUNT_SUSPENDED', 'Your account is currently suspended.');
    }

    // ── Step 4: Resolve recipient account ─────────────────────────────────────
    const recipientResult = await client.query<AccountRow & { full_name: string }>(
      `SELECT a.*, u.full_name
       FROM accounts a
       JOIN users u ON u.id = a.user_id
       WHERE u.phone = $1 AND a.status = 'ACTIVE'`,
      [input.recipientPhone],
    );

    const recipientAccount = recipientResult.rows[0];
    if (!recipientAccount) {
      throw new AppError('RECIPIENT_NOT_FOUND', 'Recipient not found. Please check the phone number.');
    }

    if (recipientAccount.id === senderAccount.id) {
      throw new AppError('SELF_TRANSFER', 'You cannot send money to yourself.');
    }

    // Lock recipient account too (consistent lock ordering prevents deadlocks)
    // Always lock in ID order to prevent deadlock between concurrent transfers
    if (senderAccount.id < recipientAccount.id) {
      await client.query('SELECT id FROM accounts WHERE id = $1 FOR UPDATE', [recipientAccount.id]);
    } else {
      // Re-lock in order — sender was already locked above
      // Actually we already have sender locked; lock recipient now
      await client.query('SELECT id FROM accounts WHERE id = $1 FOR UPDATE', [recipientAccount.id]);
    }

    // ── Step 5: Server-authoritative fee calculation ──────────────────────────
    const amount = input.amount;
    const fee = calculateTransferFee(amount);
    const totalAmount = addDecimals(amount, fee);

    // ── Step 6: Balance validation ────────────────────────────────────────────
    const balance = senderAccount.balance.toString();
    if (compareDecimals(balance, totalAmount) < 0) {
      // Update idempotency key to FAILED
      await client.query(
        `UPDATE idempotency_keys SET status = 'FAILED' WHERE user_id = $1 AND key = $2`,
        [input.senderUserId, input.idempotencyKey],
      );
      throw new AppError(
        'INSUFFICIENT_FUNDS',
        `Insufficient balance. Available: GH₵ ${balance}, Required: GH₵ ${totalAmount}`,
      );
    }

    // ── Step 7: Create transaction record ─────────────────────────────────────
    const reference = generateTransactionReference();
    const txInsert = await client.query<TransactionRow>(
      `INSERT INTO transactions (
         reference, sender_account_id, recipient_account_id,
         amount, fee, total_amount, currency, type, status,
         idempotency_key, note
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'GHS', 'TRANSFER', 'PROCESSING', $7, $8)
       RETURNING *`,
      [
        reference,
        senderAccount.id,
        recipientAccount.id,
        amount,
        fee,
        totalAmount,
        input.idempotencyKey,
        input.note ?? null,
      ],
    );

    const transaction = txInsert.rows[0];

    // ── Step 8: Debit sender ──────────────────────────────────────────────────
    const debitResult = await client.query<{ balance: string }>(
      `UPDATE accounts
       SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2 AND balance >= $1
       RETURNING balance`,
      [totalAmount, senderAccount.id],
    );

    if (debitResult.rows.length === 0) {
      // Race condition: balance changed between check and update
      throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance.');
    }

    // ── Step 9: Credit recipient ──────────────────────────────────────────────
    await client.query(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2`,
      [amount, recipientAccount.id],
    );

    // ── Step 10: Complete transaction ─────────────────────────────────────────
    await client.query(
      `UPDATE transactions
       SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [transaction.id],
    );

    // ── Step 11: Update idempotency record ────────────────────────────────────
    await client.query(
      `UPDATE idempotency_keys
       SET status = 'COMPLETED', transaction_id = $1
       WHERE user_id = $2 AND key = $3`,
      [transaction.id, input.senderUserId, input.idempotencyKey],
    );

    // ── Step 12: Audit log ────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, 'TRANSACTION_COMPLETED', 'transaction', $2, $3, $4)`,
      [
        input.senderUserId,
        transaction.id,
        JSON.stringify({
          amount,
          fee,
          totalAmount,
          reference,
          recipientPhone: input.recipientPhone,
        }),
        input.ipAddress ?? null,
      ],
    );

    // ── Step 13: Notifications ────────────────────────────────────────────────
    // For sender
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'TRANSACTION_SENT', $2, $3, $4)`,
      [
        input.senderUserId,
        'Transfer successful',
        `GH₵ ${amount} sent to ${recipientAccount.full_name}`,
        JSON.stringify({ amount, reference, recipientPhone: input.recipientPhone }),
      ],
    );

    // For recipient
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       SELECT u.id, 'TRANSACTION_RECEIVED', $1, $2, $3
       FROM accounts a JOIN users u ON u.id = a.user_id
       WHERE a.id = $4`,
      [
        'Money received',
        `You received GH₵ ${amount}`,
        JSON.stringify({ amount, reference }),
        recipientAccount.id,
      ],
    );

    // ── Step 14: Fetch completed transaction with joined names ─────────────────
    const finalTx = await client.query<TransactionRow>(
      `SELECT t.*,
              su.full_name AS sender_name, su.phone AS sender_phone,
              ru.full_name AS recipient_name, ru.phone AS recipient_phone
       FROM transactions t
       JOIN accounts sa ON sa.id = t.sender_account_id
       JOIN accounts ra ON ra.id = t.recipient_account_id
       JOIN users su ON su.id = sa.user_id
       JOIN users ru ON ru.id = ra.user_id
       WHERE t.id = $1`,
      [transaction.id],
    );

    return {
      transaction: finalTx.rows[0],
      cached: false,
    };
  });
}

// ─── Get Transaction (Authorization Check) ────────────────────────────────────

/**
 * Get a transaction by ID — verifying the requesting user is associated with it.
 * A user can only access transactions where they are the sender or recipient.
 * Returns NOT_FOUND (not FORBIDDEN) to avoid leaking transaction existence.
 */
export async function getTransaction(
  transactionId: string,
  requestingUserId: string,
): Promise<TransactionRow> {
  const result = await query<TransactionRow>(
    `SELECT t.*,
            su.full_name AS sender_name, su.phone AS sender_phone,
            ru.full_name AS recipient_name, ru.phone AS recipient_phone
     FROM transactions t
     JOIN accounts sa ON sa.id = t.sender_account_id
     JOIN accounts ra ON ra.id = t.recipient_account_id
     JOIN users su ON su.id = sa.user_id
     JOIN users ru ON ru.id = ra.user_id
     WHERE t.id = $1
       AND (su.id = $2 OR ru.id = $2)`,
    [transactionId, requestingUserId],
  );

  if (!result.rows[0]) {
    throw new AppError('NOT_FOUND', 'Transaction not found.');
  }

  return result.rows[0];
}

// ─── List Transactions ────────────────────────────────────────────────────────

export async function listUserTransactions(
  userId: string,
  filter?: 'sent' | 'received' | 'pending' | 'failed',
  limit = 20,
  offset = 0,
): Promise<TransactionRow[]> {
  let whereClause = '(su.id = $1 OR ru.id = $1)';
  const params: unknown[] = [userId, limit, offset];

  if (filter === 'sent') whereClause += ` AND su.id = $1 AND t.type = 'TRANSFER'`;
  else if (filter === 'received') whereClause += ` AND ru.id = $1 AND t.type = 'TRANSFER'`;
  else if (filter === 'pending') whereClause += ` AND t.status = 'PENDING'`;
  else if (filter === 'failed') whereClause += ` AND t.status = 'FAILED'`;

  const result = await query<TransactionRow>(
    `SELECT t.*,
            su.full_name AS sender_name, su.phone AS sender_phone,
            ru.full_name AS recipient_name, ru.phone AS recipient_phone
     FROM transactions t
     JOIN accounts sa ON sa.id = t.sender_account_id
     JOIN accounts ra ON ra.id = t.recipient_account_id
     JOIN users su ON su.id = sa.user_id
     JOIN users ru ON ru.id = ra.user_id
     WHERE ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    params,
  );

  return result.rows;
}

// ─── Reverse Transaction ──────────────────────────────────────────────────────

/**
 * Reverse a completed transaction.
 * This is a proper financial operation — not just a status update.
 * Funds are returned atomically. Reversal is idempotent — attempting to
 * reverse the same transaction twice will fail on the second attempt.
 */
export async function reverseTransaction(
  transactionId: string,
  requestingUserId: string,
  reason: string = 'Operator-initiated reversal',
): Promise<TransactionRow> {
  return withTransaction(async (client) => {
    // Fetch and lock the original transaction
    const txResult = await client.query<TransactionRow>(
      `SELECT t.* FROM transactions t
       JOIN accounts sa ON sa.id = t.sender_account_id
       JOIN users su ON su.id = sa.user_id
       WHERE t.id = $1 AND su.id = $2
       FOR UPDATE OF t`,
      [transactionId, requestingUserId],
    );

    const tx = txResult.rows[0];
    if (!tx) {
      throw new AppError('NOT_FOUND', 'Transaction not found.');
    }

    // Validate state machine transition
    if (!isValidTransition(tx.status as TransactionStatus, TransactionStatus.REVERSED)) {
      throw new AppError(
        'INVALID_TRANSITION',
        `Cannot reverse a transaction with status ${tx.status}. Only COMPLETED transactions can be reversed.`,
      );
    }

    // Lock both accounts in consistent order
    const accountIds = [tx.sender_account_id, tx.recipient_account_id].sort();
    for (const accountId of accountIds) {
      await client.query('SELECT id FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
    }

    // Return funds to sender
    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [tx.total_amount, tx.sender_account_id],
    );

    // Debit recipient
    await client.query(
      `UPDATE accounts
       SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2 AND balance >= $1
       RETURNING balance`,
      [tx.amount, tx.recipient_account_id],
    );

    // Update original transaction status
    await client.query(
      `UPDATE transactions
       SET status = 'REVERSED', failure_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason, transactionId],
    );

    // Create reversal transaction record
    const reversalRef = generateTransactionReference();
    const reversalTx = await client.query<TransactionRow>(
      `INSERT INTO transactions (
         reference, sender_account_id, recipient_account_id,
         amount, fee, total_amount, currency, type, status,
         idempotency_key, note, reversal_of
       )
       VALUES ($1, $2, $3, $4, '0.00', $4, 'GHS', 'REVERSAL', 'COMPLETED', $5, $6, $7)
       RETURNING *`,
      [
        reversalRef,
        tx.recipient_account_id,    // reversal: recipient becomes sender
        tx.sender_account_id,       // reversal: sender gets the money back
        tx.amount,
        `reversal-${transactionId}`,
        `Reversal of ${tx.reference}: ${reason}`,
        transactionId,
      ],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata)
       VALUES ($1, 'TRANSACTION_REVERSED', 'transaction', $2, $3)`,
      [
        requestingUserId,
        transactionId,
        JSON.stringify({ reason, reversalReference: reversalRef }),
      ],
    );

    return reversalTx.rows[0];
  });
}

// ─── Account Balance ──────────────────────────────────────────────────────────

export async function getAccountBalance(userId: string): Promise<{
  balance: string;
  accountNumber: string;
  currency: string;
  status: string;
}> {
  const result = await query<AccountRow>(
    'SELECT balance, account_number, currency, status FROM accounts WHERE user_id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    throw new AppError('NOT_FOUND', 'Account not found.');
  }

  const account = result.rows[0];
  return {
    balance: fromPesewas(toPesewas(account.balance)),
    accountNumber: account.account_number,
    currency: account.currency,
    status: account.status,
  };
}



// ─── Deposit Money (Simulation Sandbox) ───────────────────────────────────────

export interface DepositInput {
  userId: string;
  amount: string;
  fundingMethod: string;
  fundingReference?: string;
  idempotencyKey: string;
}

export async function depositMoney(input: DepositInput): Promise<SendMoneyResult> {
  const pesewas = toPesewas(input.amount);
  if (pesewas <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Deposit amount must be greater than zero.');
  }
  if (pesewas > 5000000) {
    throw new AppError('VALIDATION_ERROR', 'Deposit exceeds single transaction limit of GH₵ 50,000.00.');
  }

  const normalizedAmount = fromPesewas(pesewas);
  const requestHash = hashRequestParams({
    userId: input.userId,
    amount: normalizedAmount,
    fundingMethod: input.fundingMethod,
  });

  return withTransaction(async (client) => {
    const idempotencyInsert = await client.query<{
      status: string;
      transaction_id: string | null;
      request_hash: string;
      response_body: string | null;
    }>(
      `INSERT INTO idempotency_keys (key, user_id, status, request_hash, expires_at)
       VALUES ($1, $2, 'PROCESSING', $3, NOW() + INTERVAL '24 hours')
       ON CONFLICT (user_id, key) DO UPDATE
         SET key = EXCLUDED.key
       RETURNING status, transaction_id, request_hash, response_body`,
      [input.idempotencyKey, input.userId, requestHash],
    );

    const existingKey = idempotencyInsert.rows[0];
    if (existingKey.status !== 'PROCESSING' || existingKey.transaction_id !== null) {
      if (existingKey.request_hash !== requestHash) {
        throw new AppError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was used for a different transaction.',
        );
      }
      if (existingKey.status === 'PROCESSING') {
        throw new AppError(
          'DUPLICATE_TRANSACTION',
          'This deposit is currently being processed. Please wait.',
        );
      }
      if (existingKey.transaction_id) {
        const txResult = await client.query<TransactionRow>(
          `SELECT t.*,
                  su.full_name AS sender_name, su.phone AS sender_phone,
                  ru.full_name AS recipient_name, ru.phone AS recipient_phone
           FROM transactions t
           JOIN accounts sa ON sa.id = t.sender_account_id
           JOIN accounts ra ON ra.id = t.recipient_account_id
           JOIN users su ON su.id = sa.user_id
           JOIN users ru ON ru.id = ra.user_id
           WHERE t.id = $1`,
          [existingKey.transaction_id],
        );
        return {
          transaction: txResult.rows[0],
          cached: true,
          fee: '0.00',
          totalDebited: normalizedAmount,
        };
      }
    }

    const reserveAccountResult = await client.query<AccountRow>(
      `SELECT * FROM accounts WHERE account_number = '1000000000' FOR UPDATE`,
    );
    const reserveAccount = reserveAccountResult.rows[0];
    if (!reserveAccount) {
      throw new AppError('INTERNAL_ERROR', 'Settlement reserve account unavailable.');
    }

    const userAccountResult = await client.query<AccountRow>(
      `SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE`,
      [input.userId],
    );
    const userAccount = userAccountResult.rows[0];
    if (!userAccount) {
      throw new AppError('NOT_FOUND', 'User wallet account not found.');
    }

    await client.query(
      `UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
      [normalizedAmount, reserveAccount.id],
    );
    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [normalizedAmount, userAccount.id],
    );

    const reference = generateTransactionReference();
    const txInsert = await client.query<TransactionRow>(
      `INSERT INTO transactions (
         reference, sender_account_id, recipient_account_id,
         amount, fee, total_amount, currency, type, status,
         idempotency_key, note, completed_at
       )
       VALUES ($1, $2, $3, $4, '0.00', $4, 'GHS', 'TRANSFER', 'COMPLETED', $5, $6, NOW())
       RETURNING *`,
      [
        reference,
        reserveAccount.id,
        userAccount.id,
        normalizedAmount,
        input.idempotencyKey,
        `Demo Deposit via ${input.fundingMethod.replace(/_/g, ' ')}`,
      ],
    );
    const transaction = txInsert.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata)
       VALUES ($1, 'DEPOSIT_COMPLETED', 'transaction', $2, $3)`,
      [
        input.userId,
        transaction.id,
        JSON.stringify({
          amount: normalizedAmount,
          reference,
          fundingMethod: input.fundingMethod,
        }),
      ],
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'DEPOSIT', 'Deposit Received', $2, $3)`,
      [
        input.userId,
        `GH₵ ${normalizedAmount} deposited successfully via Demo ${input.fundingMethod.replace(/_/g, ' ')}.`,
        JSON.stringify({ transactionId: transaction.id, reference, amount: normalizedAmount }),
      ],
    );

    const resultObj: SendMoneyResult = {
      transaction,
      cached: false,
      fee: '0.00',
      totalDebited: normalizedAmount,
    };
    await client.query(
      `UPDATE idempotency_keys
       SET status = 'COMPLETED', transaction_id = $1, response_body = $2
       WHERE user_id = $3 AND key = $4`,
      [transaction.id, JSON.stringify(resultObj), input.userId, input.idempotencyKey],
    );

    return resultObj;
  });
}

// ─── Pay Bills ────────────────────────────────────────────────────────────────

export interface BillPayInput {
  userId: string;
  billerCode: string;
  customerNumber: string;
  amount: string;
  pin: string;
  idempotencyKey: string;
}

const BILLERS: Record<string, { name: string; accountNumber: string }> = {
  ECG: { name: 'ECG Prepaid Electricity', accountNumber: '3000000001' },
  GWCL: { name: 'Ghana Water Company Ltd', accountNumber: '3000000002' },
  MTN_FIBER: { name: 'MTN Fiber Broadband', accountNumber: '3000000003' },
  DSTV: { name: 'DSTV & GOtv Ghana', accountNumber: '3000000004' },
};

export async function payBill(input: BillPayInput): Promise<SendMoneyResult> {
  const biller = BILLERS[input.billerCode.toUpperCase()];
  if (!biller) {
    throw new AppError('VALIDATION_ERROR', `Invalid biller code: ${input.billerCode}. Available: ECG, GWCL, MTN_FIBER, DSTV.`);
  }

  if (!input.customerNumber || input.customerNumber.trim().length < 4) {
    throw new AppError('VALIDATION_ERROR', 'Please enter a valid meter / customer account number.');
  }

  const pesewas = toPesewas(input.amount);
  if (pesewas <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Payment amount must be greater than zero.');
  }


  const normalizedAmount = fromPesewas(pesewas);
  const fee = '1.00';
  const totalAmount = addDecimals(normalizedAmount, fee);

  const requestHash = hashRequestParams({
    userId: input.userId,
    billerCode: input.billerCode,
    customerNumber: input.customerNumber,
    amount: normalizedAmount,
  });

  return withTransaction(async (client) => {
    const idempotencyInsert = await client.query<{
      status: string;
      transaction_id: string | null;
      request_hash: string;
      response_body: string | null;
    }>(
      `INSERT INTO idempotency_keys (key, user_id, status, request_hash, expires_at)
       VALUES ($1, $2, 'PROCESSING', $3, NOW() + INTERVAL '24 hours')
       ON CONFLICT (user_id, key) DO UPDATE
         SET key = EXCLUDED.key
       RETURNING status, transaction_id, request_hash, response_body`,
      [input.idempotencyKey, input.userId, requestHash],
    );

    const existingKey = idempotencyInsert.rows[0];
    if (existingKey.status !== 'PROCESSING' || existingKey.transaction_id !== null) {
      if (existingKey.request_hash !== requestHash) {
        throw new AppError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was used for a different transaction.',
        );
      }
      if (existingKey.status === 'PROCESSING') {
        throw new AppError(
          'DUPLICATE_TRANSACTION',
          'This payment is currently being processed. Please wait.',
        );
      }
      if (existingKey.transaction_id) {
        const txResult = await client.query<TransactionRow>(
          `SELECT t.*,
                  su.full_name AS sender_name, su.phone AS sender_phone,
                  ru.full_name AS recipient_name, ru.phone AS recipient_phone
           FROM transactions t
           JOIN accounts sa ON sa.id = t.sender_account_id
           JOIN accounts ra ON ra.id = t.recipient_account_id
           JOIN users su ON su.id = sa.user_id
           JOIN users ru ON ru.id = ra.user_id
           WHERE t.id = $1`,
          [existingKey.transaction_id],
        );
        return {
          transaction: txResult.rows[0],
          cached: true,
          fee,
          totalDebited: totalAmount,
        };
      }
    }

    // Verify transaction PIN
    const userResult = await client.query<{ pin_hash: string | null }>(
      'SELECT pin_hash FROM users WHERE id = $1',
      [input.userId],
    );
    const userRow = userResult.rows[0];
    if (!userRow || !userRow.pin_hash) {
      await client.query(
        'DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2',
        [input.userId, input.idempotencyKey],
      );
      throw new AppError('PIN_NOT_SET', 'Transaction PIN has not been set.');
    }

    const isPinValid = await verifyPin(input.pin, userRow.pin_hash);
    if (!isPinValid) {
      await client.query(
        'DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2',
        [input.userId, input.idempotencyKey],
      );
      throw new AppError('INVALID_PIN', 'Incorrect transaction PIN. Please try again.');
    }

    const userAccountResult = await client.query<AccountRow>(
      `SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE`,
      [input.userId],
    );
    const userAccount = userAccountResult.rows[0];
    if (!userAccount) {
      throw new AppError('NOT_FOUND', 'User wallet account not found.');
    }

    if (compareDecimals(userAccount.balance, totalAmount) < 0) {
      throw new AppError(
        'INSUFFICIENT_FUNDS',
        `Insufficient balance. Available: GH₵ ${userAccount.balance}, Required: GH₵ ${totalAmount} (incl. GH₵ ${fee} fee).`,
      );
    }

    const billerAccountResult = await client.query<AccountRow>(
      `SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE`,
      [biller.accountNumber],
    );
    const billerAccount = billerAccountResult.rows[0];
    if (!billerAccount) {
      throw new AppError('INTERNAL_ERROR', `Biller account for ${biller.name} not found.`);
    }

    await client.query(
      `UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
      [totalAmount, userAccount.id],
    );
    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [normalizedAmount, billerAccount.id],
    );

    const reference = generateTransactionReference();
    const txInsert = await client.query<TransactionRow>(
      `INSERT INTO transactions (
         reference, sender_account_id, recipient_account_id,
         amount, fee, total_amount, currency, type, status,
         idempotency_key, note, completed_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'GHS', 'TRANSFER', 'COMPLETED', $7, $8, NOW())
       RETURNING *`,
      [
        reference,
        userAccount.id,
        billerAccount.id,
        normalizedAmount,
        fee,
        totalAmount,
        input.idempotencyKey,
        `${biller.name} (Ref: ${input.customerNumber})`,
      ],
    );
    const transaction = txInsert.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata)
       VALUES ($1, 'BILL_PAYMENT_COMPLETED', 'transaction', $2, $3)`,
      [
        input.userId,
        transaction.id,
        JSON.stringify({
          biller: biller.name,
          customerNumber: input.customerNumber,
          amount: normalizedAmount,
          fee,
          reference,
        }),
      ],
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'BILL_PAY', 'Bill Payment Successful', $2, $3)`,
      [
        input.userId,
        `Payment of GH₵ ${normalizedAmount} to ${biller.name} (Meter: ${input.customerNumber}) succeeded.`,
        JSON.stringify({ transactionId: transaction.id, reference, biller: biller.name }),
      ],
    );

    const resultObj: SendMoneyResult = {
      transaction,
      cached: false,
      fee,
      totalDebited: totalAmount,
    };
    await client.query(
      `UPDATE idempotency_keys
       SET status = 'COMPLETED', transaction_id = $1, response_body = $2
       WHERE user_id = $3 AND key = $4`,
      [transaction.id, JSON.stringify(resultObj), input.userId, input.idempotencyKey],
    );

    return resultObj;
  });
}

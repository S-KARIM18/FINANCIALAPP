import { query, withTransaction } from '../config/database';
import { AppError } from '../utils/AppError';
import {
  generateTransactionReference,
  normalizeGhanaPhone,
  toPesewas,
  fromPesewas,
} from '../utils/financial';
import { sendMoney } from './transaction.service';
import { SendMoneyResult } from '../types/transaction';

export interface PaymentRequestRow {
  id: string;
  reference: string;
  requester_user_id: string;
  payer_user_id: string;
  amount: string;
  currency: string;
  note: string | null;
  status: 'PENDING' | 'PAID' | 'DECLINED' | 'CANCELLED';
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
  requester_name?: string;
  requester_phone?: string;
  payer_name?: string;
  payer_phone?: string;
}

export interface CreatePaymentRequestInput {
  requesterUserId: string;
  payerPhone: string;
  amount: string;
  note?: string;
  idempotencyKey: string;
}

export async function createPaymentRequest(
  input: CreatePaymentRequestInput,
): Promise<PaymentRequestRow> {
  const pesewas = toPesewas(input.amount);
  if (pesewas <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Request amount must be greater than zero.');
  }
  if (pesewas > 5000000) {
    throw new AppError('VALIDATION_ERROR', 'Request exceeds maximum limit of GH₵ 50,000.00.');
  }

  const normalizedAmount = fromPesewas(pesewas);
  let normalizedPayerPhone: string;
  try {
    normalizedPayerPhone = normalizeGhanaPhone(input.payerPhone);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid Ghana phone number format.');
  }

  return withTransaction(async (client) => {
    // 1. Check if same idempotency key was used by this user
    const existingReq = await client.query<PaymentRequestRow>(
      `SELECT pr.*,
              req_u.full_name AS requester_name, req_u.phone AS requester_phone,
              pay_u.full_name AS payer_name, pay_u.phone AS payer_phone
       FROM payment_requests pr
       JOIN users req_u ON req_u.id = pr.requester_user_id
       JOIN users pay_u ON pay_u.id = pr.payer_user_id
       WHERE pr.requester_user_id = $1 AND pr.idempotency_key = $2`,
      [input.requesterUserId, input.idempotencyKey],
    );

    if (existingReq.rows.length > 0) {
      return existingReq.rows[0];
    }

    // 2. Fetch Requester details
    const requesterRes = await client.query<{ full_name: string; phone: string }>(
      'SELECT full_name, phone FROM users WHERE id = $1',
      [input.requesterUserId],
    );
    const requester = requesterRes.rows[0];
    if (!requester) {
      throw new AppError('NOT_FOUND', 'Requester user not found.');
    }

    // 3. Fetch Payer details
    const payerRes = await client.query<{ id: string; full_name: string; phone: string }>(
      'SELECT id, full_name, phone FROM users WHERE phone = $1',
      [normalizedPayerPhone],
    );
    const payer = payerRes.rows[0];
    if (!payer) {
      throw new AppError('NOT_FOUND', 'The recipient is not registered on KudiFlow.');
    }

    // 4. Prevent self-request
    if (payer.id === input.requesterUserId) {
      throw new AppError('VALIDATION_ERROR', 'Cannot request money from yourself.');
    }

    // 5. Insert payment request
    const reference = 'REQ-' + generateTransactionReference().replace('KDF-', '');
    const insertRes = await client.query<PaymentRequestRow>(
      `INSERT INTO payment_requests (
         reference, requester_user_id, payer_user_id, amount,
         currency, note, status, idempotency_key
       )
       VALUES ($1, $2, $3, $4, 'GHS', $5, 'PENDING', $6)
       RETURNING *`,
      [
        reference,
        input.requesterUserId,
        payer.id,
        normalizedAmount,
        input.note || null,
        input.idempotencyKey,
      ],
    );

    const created = insertRes.rows[0];

    // 6. Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata)
       VALUES ($1, 'PAYMENT_REQUEST_CREATED', 'payment_request', $2, $3)`,
      [
        input.requesterUserId,
        created.id,
        JSON.stringify({
          reference,
          payerPhone: normalizedPayerPhone,
          amount: normalizedAmount,
          note: input.note,
        }),
      ],
    );

    // 7. Notification for payer
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'PAYMENT_REQUEST', 'New Payment Request', $2, $3)`,
      [
        payer.id,
        `${requester.full_name} requested GH₵ ${normalizedAmount}${input.note ? ': ' + input.note : ''}.`,
        JSON.stringify({ requestId: created.id, reference, amount: normalizedAmount, requesterName: requester.full_name }),
      ],
    );

    return {
      ...created,
      requester_name: requester.full_name,
      requester_phone: requester.phone,
      payer_name: payer.full_name,
      payer_phone: payer.phone,
    };
  });
}

export async function listPaymentRequests(
  userId: string,
  type: 'inbound' | 'outbound' | 'all' = 'all',
): Promise<PaymentRequestRow[]> {
  let whereClause = '(pr.requester_user_id = $1 OR pr.payer_user_id = $1)';
  if (type === 'inbound') {
    whereClause = 'pr.payer_user_id = $1';
  } else if (type === 'outbound') {
    whereClause = 'pr.requester_user_id = $1';
  }

  const result = await query<PaymentRequestRow>(
    `SELECT pr.*,
            req_u.full_name AS requester_name, req_u.phone AS requester_phone,
            pay_u.full_name AS payer_name, pay_u.phone AS payer_phone
     FROM payment_requests pr
     JOIN users req_u ON req_u.id = pr.requester_user_id
     JOIN users pay_u ON pay_u.id = pr.payer_user_id
     WHERE ${whereClause}
     ORDER BY pr.created_at DESC`,
    [userId],
  );

  return result.rows;
}

export async function payPaymentRequest(
  requestId: string,
  payerUserId: string,
  pin: string,
  idempotencyKey: string,
): Promise<{ request: PaymentRequestRow; payment: SendMoneyResult }> {
  const reqRes = await query<PaymentRequestRow>(
    `SELECT pr.*, req_u.phone AS requester_phone, req_u.full_name AS requester_name
     FROM payment_requests pr
     JOIN users req_u ON req_u.id = pr.requester_user_id
     WHERE pr.id = $1`,
    [requestId],
  );

  const pr = reqRes.rows[0];
  if (!pr) {
    throw new AppError('NOT_FOUND', 'Payment request not found.');
  }

  if (pr.payer_user_id !== payerUserId) {
    throw new AppError('FORBIDDEN', 'You are not authorized to pay this request.');
  }

  if (pr.status !== 'PENDING') {
    throw new AppError('VALIDATION_ERROR', `Payment request is already ${pr.status.toLowerCase()}.`);
  }

  // Execute transfer from payer to requester
  const payment = await sendMoney({
    senderUserId: payerUserId,
    recipientPhone: pr.requester_phone!,
    amount: pr.amount,
    pin,
    note: `Payment for request ${pr.reference}`,
    idempotencyKey,
  });

  // Mark request as PAID
  const updatedRes = await query<PaymentRequestRow>(
    `UPDATE payment_requests SET status = 'PAID', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [requestId],
  );

  return { request: updatedRes.rows[0], payment };
}

export async function declinePaymentRequest(
  requestId: string,
  payerUserId: string,
): Promise<PaymentRequestRow> {
  const reqRes = await query<PaymentRequestRow>(
    'SELECT * FROM payment_requests WHERE id = $1',
    [requestId],
  );

  const pr = reqRes.rows[0];
  if (!pr) {
    throw new AppError('NOT_FOUND', 'Payment request not found.');
  }

  if (pr.payer_user_id !== payerUserId) {
    throw new AppError('FORBIDDEN', 'You are not authorized to decline this request.');
  }

  if (pr.status !== 'PENDING') {
    throw new AppError('VALIDATION_ERROR', `Payment request is already ${pr.status.toLowerCase()}.`);
  }

  const updatedRes = await query<PaymentRequestRow>(
    `UPDATE payment_requests SET status = 'DECLINED', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [requestId],
  );

  return updatedRes.rows[0];
}

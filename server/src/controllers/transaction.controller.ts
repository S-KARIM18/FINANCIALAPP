import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as txService from '../services/transaction.service';
import { AppError } from '../utils/AppError';
import { normalizeGhanaPhone } from '../utils/financial';

export const sendMoneySchema = z.object({
  recipientPhone: z.string().min(9, 'Invalid recipient phone number'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number')
    .refine((v) => {
      const parts = v.split('.');
      const whole = BigInt(parts[0] || '0');
      const frac = BigInt(((parts[1] || '') + '00').slice(0, 2));
      const pesewas = whole * 100n + frac;
      return pesewas > 0n && pesewas <= 5000000n; // <= 50,000.00 GHS
    }, 'Amount must be greater than 0 and at most GH₵ 50,000'),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
  note: z.string().max(255).optional(),
});

export async function createTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required (min 8 chars).');
    }

    const { recipientPhone, amount, note, pin } = sendMoneySchema.parse(req.body);

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeGhanaPhone(recipientPhone);
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid recipient phone number format.');
    }

    const result = await txService.sendMoney({
      senderUserId: req.user.userId, // from verified JWT — never from client body
      recipientPhone: normalizedPhone,
      amount,
      note,
      idempotencyKey: idempotencyKey.trim(),
      pin,
      ipAddress: req.ip,
    });

    const statusCode = result.cached ? 200 : 201;
    res.status(statusCode).json({
      success: true,
      data: {
        transaction: result.transaction,
        cached: result.cached,
        message: result.cached
          ? 'Payment already processed. Returning existing transaction.'
          : 'Payment completed successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const filter = (req.query.filter || req.query.type) as 'sent' | 'received' | 'pending' | 'failed' | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await txService.listUserTransactions(req.user.userId, filter, limit, offset);

    res.json({ success: true, data: { transactions, limit, offset } });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    // Authorization check is inside the service — user can only see their own transactions
    const transaction = await txService.getTransaction(req.params.id, req.user.userId);

    res.json({ success: true, data: { transaction } });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const transaction = await txService.getTransaction(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: {
        id: transaction.id,
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount,
        completedAt: transaction.completed_at,
        failureReason: transaction.failure_reason,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function reverseTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    const reversalTx = await txService.reverseTransaction(
      req.params.id,
      req.user.userId,
      reason,
    );

    res.json({
      success: true,
      data: {
        transaction: reversalTx,
        message: 'Transaction reversed successfully. Funds returned to sender.',
      },
    });
  } catch (err) {
    next(err);
  }
}



export const depositSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number'),
  fundingMethod: z.string().min(1, 'Funding method is required'),
  fundingReference: z.string().optional(),
});

export async function deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const idempotencyKey = (req.headers['idempotency-key'] as string) || `dep-${Date.now()}`;
    const { amount, fundingMethod, fundingReference } = depositSchema.parse(req.body);
    const result = await txService.depositMoney({
      userId: req.user.userId,
      amount,
      fundingMethod,
      fundingReference,
      idempotencyKey,
    });
    res.status(result.cached ? 200 : 201).json({
      success: true,
      data: {
        transaction: result.transaction,
        cached: result.cached,
        message: 'Deposit successful.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export const billPaySchema = z.object({
  billerCode: z.string().min(2, 'Biller code is required'),
  customerNumber: z.string().min(4, 'Account/meter number is required'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number'),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
});

export async function payBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const idempotencyKey = (req.headers['idempotency-key'] as string) || `bill-${Date.now()}`;
    const { billerCode, customerNumber, amount, pin } = billPaySchema.parse(req.body);
    const result = await txService.payBill({
      userId: req.user.userId,
      billerCode,
      customerNumber,
      amount,
      pin,
      idempotencyKey,
    });
    res.status(result.cached ? 200 : 201).json({
      success: true,
      data: {
        transaction: result.transaction,
        cached: result.cached,
        message: 'Bill payment successful.',
      },
    });
  } catch (err) {
    next(err);
  }
}

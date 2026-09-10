import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as prService from '../services/payment-request.service';
import { AppError } from '../utils/AppError';

export const createPaymentRequestSchema = z.object({
  payerPhone: z.string().min(9, 'Invalid phone number').optional(),
  recipientPhone: z.string().min(9, 'Invalid phone number').optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal number'),
  note: z.string().max(255).optional(),
}).refine(data => data.payerPhone || data.recipientPhone, {
  message: 'Phone number is required',
});

export async function createPaymentRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const idempotencyKey = (req.headers['idempotency-key'] as string) || `req-${Date.now()}`;
    const parsed = createPaymentRequestSchema.parse(req.body);
    const payerPhone = (parsed.payerPhone || parsed.recipientPhone)!;

    const result = await prService.createPaymentRequest({
      requesterUserId: req.user.userId,
      payerPhone,
      amount: parsed.amount,
      note: parsed.note,
      idempotencyKey,
    });

    res.status(201).json({
      success: true,
      data: {
        paymentRequest: result,
        message: 'Payment request created successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listPaymentRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const type = (req.query.type || req.query.filter) as 'inbound' | 'outbound' | 'all' | undefined;
    const requests = await prService.listPaymentRequests(req.user.userId, type);

    res.status(200).json({
      success: true,
      data: {
        paymentRequests: requests,
        requests,
      },
    });
  } catch (err) {
    next(err);
  }
}

export const payRequestSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
});

export async function payPaymentRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const idempotencyKey = (req.headers['idempotency-key'] as string) || `payreq-${Date.now()}`;
    const { pin } = payRequestSchema.parse(req.body);

    const result = await prService.payPaymentRequest(
      req.params.id,
      req.user.userId,
      pin,
      idempotencyKey,
    );

    res.status(200).json({
      success: true,
      data: {
        ...result,
        message: 'Payment request settled successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function declinePaymentRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const result = await prService.declinePaymentRequest(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      data: {
        paymentRequest: result,
        message: 'Payment request declined.',
      },
    });
  } catch (err) {
    next(err);
  }
}

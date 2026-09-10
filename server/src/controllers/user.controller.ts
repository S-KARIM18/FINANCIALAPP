import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';
import { getCurrentUser } from '../services/auth.service';
import { getAccountBalance } from '../services/transaction.service';

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const user = await getCurrentUser(req.user.userId);
    const account = await getAccountBalance(req.user.userId);
    res.json({ success: true, data: { user, account } });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');

    const updateSchema = z.object({
      fullName: z.string().min(2).max(255).optional(),
    });

    const updates = updateSchema.parse(req.body);
    const { query } = await import('../config/database');

    if (updates.fullName) {
      await query(
        'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2',
        [updates.fullName.trim(), req.user.userId],
      );
    }

    const user = await getCurrentUser(req.user.userId);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function getMyAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const account = await getAccountBalance(req.user.userId);
    res.json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
}

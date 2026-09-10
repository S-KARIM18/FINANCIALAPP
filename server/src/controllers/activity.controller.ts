import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { getUserActivity } from '../services/audit.service';

export async function getActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const activity = await getUserActivity(req.user.userId, limit, offset);
    res.json({ success: true, data: { activity } });
  } catch (err) {
    next(err);
  }
}

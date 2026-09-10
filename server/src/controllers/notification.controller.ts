import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import * as notifService from '../services/notification.service';

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const notifications = await notifService.getUserNotifications(req.user.userId);
    res.json({ success: true, data: { notifications } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    await notifService.markNotificationRead(req.params.id, req.user.userId);
    res.json({ success: true, data: { message: 'Notification marked as read.' } });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    await notifService.markAllNotificationsRead(req.user.userId);
    res.json({ success: true, data: { message: 'All notifications marked as read.' } });
  } catch (err) {
    next(err);
  }
}

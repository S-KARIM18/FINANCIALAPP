import { query } from '../config/database';
import { NotificationRow } from '../types/transaction';

export async function getUserNotifications(
  userId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  const result = await query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId],
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
}

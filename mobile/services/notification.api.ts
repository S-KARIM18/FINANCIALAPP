/**
 * Notification API service
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import { Notification } from '../types';

export async function listNotifications(limit = 30, offset = 0): Promise<Notification[]> {
  const res = await api.get(API_ENDPOINTS.notifications, {
    params: { limit, offset },
  });
  return res.data.data.notifications as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(API_ENDPOINTS.markNotificationRead(id));
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post(API_ENDPOINTS.markAllNotificationsRead);
}

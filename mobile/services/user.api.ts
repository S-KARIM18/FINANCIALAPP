/**
 * User API service
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import { User, Account } from '../types';

export async function getMe(): Promise<{ user: User; account: Account }> {
  const res = await api.get(API_ENDPOINTS.me);
  const { user, account } = res.data.data;
  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      phone: user.phone,
      email: user.email,
      status: user.status,
      hasPin: user.has_pin,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    account,
  };
}

export async function getMyAccount(): Promise<Account> {
  const res = await api.get(API_ENDPOINTS.myAccount);
  return res.data.data.account as Account;
}

export async function updateMe(updates: { fullName?: string }): Promise<User> {
  const res = await api.patch(API_ENDPOINTS.updateMe, {
    ...(updates.fullName && { fullName: updates.fullName }),
  });
  const user = res.data.data.user;
  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone,
    email: user.email,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

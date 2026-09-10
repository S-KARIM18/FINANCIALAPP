/**
 * Auth API service
 */
import api, { saveTokens, clearTokens } from './api';
import { API_ENDPOINTS } from '../constants/api';
import { LoginResult, AuthTokens } from '../types';

export async function register(data: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{ userId: string; phone: string; accountNumber: string }> {
  const res = await api.post(API_ENDPOINTS.register, data);
  return res.data.data;
}

export async function verifyOtp(phone: string, otp: string): Promise<{ accessToken?: string; refreshToken?: string; user?: unknown } | void> {
  const res = await api.post(API_ENDPOINTS.verifyOtp, { phone, otp });
  if (res.data?.data?.accessToken && res.data?.data?.refreshToken) {
    await saveTokens(res.data.data.accessToken, res.data.data.refreshToken);
  }
  return res.data?.data;
}

export async function setPin(pin: string, confirmPin: string): Promise<void> {
  await api.post(API_ENDPOINTS.setPin, { pin, confirmPin });
}

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  const res = await api.post(API_ENDPOINTS.login, { identifier, password });
  const { user, accessToken, refreshToken } = res.data.data as LoginResult;

  // SECURITY: Tokens stored in expo-secure-store, never AsyncStorage
  await saveTokens(accessToken, refreshToken);

  return { user, accessToken, refreshToken };
}

export async function logout(): Promise<void> {
  // Clear tokens from secure storage
  await clearTokens();
}

export async function forgotPassword(phone: string): Promise<void> {
  await api.post(API_ENDPOINTS.forgotPassword, { phone });
}

export async function resetPassword(
  phone: string,
  otp: string,
  newPassword: string,
): Promise<void> {
  await api.post(API_ENDPOINTS.resetPassword, { phone, otp, newPassword });
}

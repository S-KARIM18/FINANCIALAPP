/**
 * KudiFlow API Configuration
 */

import Constants from 'expo-constants';

// Automatically detect your development machine's IP when testing via Expo Go on a physical phone
const getDevBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
};

const DEV_BASE_URL = getDevBaseUrl();
const PROD_BASE_URL = 'https://api.kudiflow.gh';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? DEV_BASE_URL : PROD_BASE_URL);

export const API_TIMEOUT_MS = 15000; // 15 seconds

export const API_ENDPOINTS = {
  // Auth
  register: '/api/auth/register',
  verifyOtp: '/api/auth/verify-otp',
  setPin: '/api/auth/set-pin',
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',

  // User
  me: '/api/users/me',
  myAccount: '/api/users/me/account',
  updateMe: '/api/users/me',

  // Transactions
  transactions: '/api/transactions',
  deposit: '/api/transactions/deposit',
  billPay: '/api/transactions/bill-pay',
  transactionById: (id: string) => `/api/transactions/${id}`,
  transactionStatus: (id: string) => `/api/transactions/${id}/status`,
  reverseTransaction: (id: string) => `/api/transactions/${id}/reverse`,

  // Payment Requests
  paymentRequests: '/api/payment-requests',
  payPaymentRequest: (id: string) => `/api/payment-requests/${id}/pay`,
  declinePaymentRequest: (id: string) => `/api/payment-requests/${id}/decline`,

  // Activity & Notifications
  activity: '/api/activity',
  notifications: '/api/notifications',
  markNotificationRead: (id: string) => `/api/notifications/${id}/read`,
  markAllNotificationsRead: '/api/notifications/read-all',

  // Health
  health: '/health',
} as const;

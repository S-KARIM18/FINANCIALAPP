/**
 * KudiFlow Centralized API Client
 *
 * Single Axios instance that handles:
 * - Base URL configuration
 * - JWT access token attachment on every request
 * - Automatic token refresh on 401
 * - Logout when refresh fails
 * - Network error handling
 * - Timeouts
 *
 * SECURITY: Access/refresh tokens stored ONLY in expo-secure-store.
 * Never stored in AsyncStorage.
 *
 * NETWORK UNCERTAINTY: Timeout errors are surfaced clearly so the mobile
 * UI can show "Checking status..." instead of "Payment failed".
 */

import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT_MS, API_ENDPOINTS } from '../constants/api';

// ─── Secure Token Storage Keys ─────────────────────────────────────────────────
// Keys used with expo-secure-store — encrypted on-device storage
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'kudiflow_access_token',
  REFRESH_TOKEN: 'kudiflow_refresh_token',
} as const;

// ─── Token Storage ─────────────────────────────────────────────────────────────

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
  ]);
}

// ─── Axios Instance ────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Callback to trigger logout from auth store — set during app initialization
let onLogout: (() => void) | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export function setAuthCallbacks(
  logoutFn: () => void,
  tokenRefreshedFn: (token: string) => void,
): void {
  onLogout = logoutFn;
  onTokenRefreshed = tokenRefreshedFn;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — Attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — Token Refresh ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 — attempt token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== API_ENDPOINTS.refresh &&
      originalRequest.url !== API_ENDPOINTS.login
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) return null;

            const response = await axios.post(
              `${API_BASE_URL}${API_ENDPOINTS.refresh}`,
              { refreshToken },
              { timeout: API_TIMEOUT_MS },
            );

            const newAccessToken: string = response.data.data.accessToken;
            await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, newAccessToken);
            onTokenRefreshed?.(newAccessToken);
            return newAccessToken;
          } catch {
            // Refresh failed — clear tokens and trigger logout
            await clearTokens();
            onLogout?.();
            return null;
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken && originalRequest.headers) {
        (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

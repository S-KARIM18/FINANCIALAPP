// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  OTP_EXPIRED: 'OTP_EXPIRED',
  INVALID_OTP: 'INVALID_OTP',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_COOLDOWN: 'OTP_COOLDOWN',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PIN_NOT_SET: 'PIN_NOT_SET',
  INVALID_PIN: 'INVALID_PIN',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_TRANSACTION: 'INVALID_TRANSACTION',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  RECIPIENT_NOT_FOUND: 'RECIPIENT_NOT_FOUND',
  SELF_TRANSFER: 'SELF_TRANSFER',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  REVERSAL_FAILED: 'REVERSAL_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── HTTP Status Map ──────────────────────────────────────────────────────────

export const ErrorHttpStatus: Record<ErrorCodeType, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_CREDENTIALS: 401,
  OTP_EXPIRED: 400,
  INVALID_OTP: 400,
  OTP_MAX_ATTEMPTS: 429,
  OTP_COOLDOWN: 429,
  PHONE_ALREADY_EXISTS: 409,
  EMAIL_ALREADY_EXISTS: 409,
  PIN_NOT_SET: 400,
  INVALID_PIN: 400,
  INSUFFICIENT_FUNDS: 422,
  INVALID_TRANSACTION: 400,
  IDEMPOTENCY_KEY_REUSED: 409,
  DUPLICATE_TRANSACTION: 200, // return 200 with cached result
  INVALID_TRANSITION: 422,
  TRANSACTION_FAILED: 422,
  RECIPIENT_NOT_FOUND: 404,
  SELF_TRANSFER: 400,
  ACCOUNT_SUSPENDED: 403,
  REVERSAL_FAILED: 422,
  INTERNAL_ERROR: 500,
};

// ─── Auth Input Types ─────────────────────────────────────────────────────────

export interface RegisterInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export interface LoginInput {
  identifier: string; // phone or email
  password: string;
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
}

export interface SetPinInput {
  pin: string;
}

export interface ForgotPasswordInput {
  phone: string;
}

export interface ResetPasswordInput {
  phone: string;
  otp: string;
  newPassword: string;
}

// ─── JWT Payload Types ────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  phone: string;
  type: 'access' | 'refresh';
}

// ─── Express Request Extension ────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone: string;
      };
    }
  }
}

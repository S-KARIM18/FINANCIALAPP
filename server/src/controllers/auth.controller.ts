import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import * as otpService from '../services/otp.service';
import * as auditService from '../services/audit.service';
import { normalizeGhanaPhone } from '../utils/financial';
import { AppError } from '../utils/AppError';
import { ApiSuccess, RegisterInput, LoginInput } from '../types/api';
import { signAccessToken, signRefreshToken } from '../config/jwt';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255),
  phone: z.string().min(9, 'Invalid phone number').max(20),
  email: z.string().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a number',
    ),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Phone number or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(9),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const setPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
  confirmPin: z.string().length(4),
}).refine((data) => data.pin === data.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin'],
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  phone: z.string().min(9, 'Invalid phone number'),
});

export const resetPasswordSchema = z.object({
  phone: z.string().min(9),
  otp: z.string().length(6).regex(/^\d{6}$/),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and a number'),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body) as RegisterInput;
    const { user, account } = await authService.registerUser(input);

    // Send OTP for phone verification
    await otpService.createOtp(user.id, user.phone, 'PHONE_VERIFICATION');

    await auditService.createAuditLog({
      userId: user.id,
      eventType: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
    });

    const response: ApiSuccess = {
      success: true,
      data: {
        message: 'Account created. Please verify your phone number.',
        userId: user.id,
        phone: user.phone,
        accountNumber: account.account_number,
      },
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);
    const normalizedPhone = normalizeGhanaPhone(phone);

    // Find user by phone
    const { query } = await import('../config/database');
    const userResult = await query<{ id: string; status: string }>(
      'SELECT id, status FROM users WHERE phone = $1',
      [normalizedPhone],
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found.');
    }

    await otpService.verifyOtp(user.id, otp, 'PHONE_VERIFICATION');

    // Activate user upon successful phone verification
    await query(
      "UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1",
      [user.id],
    );

    await auditService.createAuditLog({
      userId: user.id,
      eventType: 'PHONE_VERIFIED',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
    });

    const accessToken = signAccessToken({ userId: user.id, phone: normalizedPhone });
    const refreshToken = signRefreshToken({ userId: user.id, phone: normalizedPhone });

    res.json({
      success: true,
      data: {
        message: 'Phone verified successfully. Please set your PIN.',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: normalizedPhone,
          status: 'ACTIVE',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function setPin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required.');
    const { pin } = setPinSchema.parse(req.body);

    await authService.setUserPin(req.user.userId, pin);

    await auditService.createAuditLog({
      userId: req.user.userId,
      eventType: 'PIN_CREATED',
      entityType: 'user',
      entityId: req.user.userId,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: 'Transaction PIN set successfully.' } });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body) as LoginInput;
    const result = await authService.loginUser(input);

    await auditService.createAuditLog({
      userId: result.user.id,
      eventType: 'USER_LOGIN',
      entityType: 'user',
      entityId: result.user.id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone } = forgotPasswordSchema.parse(req.body);
    const normalizedPhone = normalizeGhanaPhone(phone);

    const { query } = await import('../config/database');
    const userResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE phone = $1',
      [normalizedPhone],
    );

    // Always return success to prevent user enumeration
    if (userResult.rows[0]) {
      await otpService.createOtp(userResult.rows[0].id, normalizedPhone, 'PASSWORD_RESET');
    }

    res.json({
      success: true,
      data: { message: 'If an account exists with this number, a reset code has been sent.' },
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, otp, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedPhone = normalizeGhanaPhone(phone);

    const { query } = await import('../config/database');
    const userResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE phone = $1',
      [normalizedPhone],
    );
    const user = userResult.rows[0];
    if (!user) throw new AppError('NOT_FOUND', 'User not found.');

    await otpService.verifyOtp(user.id, otp, 'PASSWORD_RESET');

    const { hashPassword } = await import('../services/auth.service');
    const passwordHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, user.id]);

    await auditService.createAuditLog({
      userId: user.id,
      eventType: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: 'Password reset successfully. Please log in.' } });
  } catch (err) {
    next(err);
  }
}

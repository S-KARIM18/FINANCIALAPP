import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { AppError } from '../utils/AppError';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const BCRYPT_ROUNDS = 12;

type OtpPurpose = 'PHONE_VERIFICATION' | 'PASSWORD_RESET';

/**
 * Generate a cryptographically random 6-digit OTP.
 */
function generateOtpCode(): string {
  const bytes = crypto.randomBytes(3);
  const num = parseInt(bytes.toString('hex'), 16) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Create and store an OTP for the given user.
 *
 * DEVELOPMENT: The raw OTP is logged to console ONLY when NODE_ENV=development.
 * In production, integrate a real SMS provider (e.g., Twilio, Africa's Talking)
 * by replacing the console.log with an SMS API call.
 *
 * SECURITY: Only the bcrypt hash of the OTP is persisted to the database.
 */
export async function createOtp(
  userId: string,
  phone: string,
  purpose: OtpPurpose,
): Promise<void> {
  // Check cooldown — prevent OTP spam
  const recentOtp = await query<{ created_at: Date }>(
    `SELECT created_at FROM otp_codes
     WHERE user_id = $1 AND purpose = $2
       AND created_at > NOW() - INTERVAL '${OTP_RESEND_COOLDOWN_SECONDS} seconds'
       AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose],
  );

  if (recentOtp.rows.length > 0) {
    const elapsed = Date.now() - new Date(recentOtp.rows[0].created_at).getTime();
    const remaining = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsed) / 1000);
    throw new AppError(
      'OTP_COOLDOWN',
      `Please wait ${remaining} seconds before requesting a new code.`,
    );
  }

  // Invalidate any existing unexpired OTPs for this purpose
  await query(
    `UPDATE otp_codes SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose],
  );

  // Generate OTP and hash it
  const rawOtp = generateOtpCode();
  const codeHash = await bcrypt.hash(rawOtp, BCRYPT_ROUNDS);

  await query(
    `INSERT INTO otp_codes (user_id, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '${OTP_EXPIRY_MINUTES} minutes')`,
    [userId, codeHash, purpose],
  );

  // ─── SMS Integration Point ────────────────────────────────────────────────
  // DEVELOPMENT ONLY: Log OTP to console
  // In production: replace with real SMS provider call
  // Example: await sendSms(phone, `Your KudiFlow code is ${rawOtp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`);
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log(`[OTP][DEV ONLY] Phone: ${phone} | Code: ${rawOtp} | Purpose: ${purpose}`);
  } else {
    // Production: integrate SMS provider here
    // await smsProvider.send(phone, rawOtp);
    console.warn('[OTP] SMS provider not configured. Implement smsProvider.send() for production.');
  }
}

/**
 * Verify an OTP submitted by the user.
 * Enforces attempt limits and expiry.
 * Marks as used on success.
 */
export async function verifyOtp(
  userId: string,
  rawOtp: string,
  purpose: OtpPurpose,
): Promise<void> {
  const result = await query<{
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT id, code_hash, attempts, expires_at, used_at FROM otp_codes
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose],
  );

  const otp = result.rows[0];

  if (!otp) {
    throw new AppError('INVALID_OTP', 'Invalid or expired verification code.');
  }

  if (new Date() > new Date(otp.expires_at)) {
    throw new AppError('OTP_EXPIRED', 'Verification code has expired. Please request a new one.');
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError('OTP_MAX_ATTEMPTS', 'Too many failed attempts. Please request a new code.');
  }

  const isValid = await bcrypt.compare(rawOtp, otp.code_hash);

  if (!isValid) {
    // Increment attempt counter
    await query(
      'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1',
      [otp.id],
    );
    const remaining = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    throw new AppError(
      'INVALID_OTP',
      `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    );
  }

  // Mark as used — cannot be reused
  await query(
    'UPDATE otp_codes SET used_at = NOW() WHERE id = $1',
    [otp.id],
  );
}

import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { signAccessToken, signRefreshToken } from '../config/jwt';
import { AppError } from '../utils/AppError';
import { normalizeGhanaPhone, generateAccountNumber } from '../utils/financial';
import { RegisterInput, LoginInput } from '../types/api';
import { UserRow, AccountRow } from '../types/transaction';

const BCRYPT_ROUNDS = 12;

// ─── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a password with bcrypt at cost factor 12.
 * Never store the result in logs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored bcrypt hash.
 * Returns false (never throws) to prevent timing attacks from leaking info.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Hash a 4-digit PIN with bcrypt.
 * PINs are short — we use bcrypt with the same cost factor for consistency.
 * Never store the PIN itself.
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function verifyPin(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerUser(input: RegisterInput): Promise<{
  user: Omit<UserRow, 'password_hash' | 'pin_hash'>;
  account: AccountRow;
}> {
  // Normalize and validate phone
  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeGhanaPhone(input.phone);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid Ghana phone number. Use format: 024XXXXXXX or +233XXXXXXXXX');
  }

  // Check for duplicate phone
  const existingPhone = await query<UserRow>(
    'SELECT id FROM users WHERE phone = $1',
    [normalizedPhone],
  );
  if (existingPhone.rows.length > 0) {
    throw new AppError('PHONE_ALREADY_EXISTS', 'This phone number is already registered.');
  }

  // Check for duplicate email
  const normalizedEmail = input.email.toLowerCase().trim();
  const existingEmail = await query<UserRow>(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail],
  );
  if (existingEmail.rows.length > 0) {
    throw new AppError('EMAIL_ALREADY_EXISTS', 'This email address is already registered.');
  }

  // Hash password — NEVER store plaintext
  const passwordHash = await hashPassword(input.password);

  // Create user
  const userResult = await query<UserRow>(
    `INSERT INTO users (full_name, phone, email, password_hash, status)
     VALUES ($1, $2, $3, $4, 'PENDING_VERIFICATION')
     RETURNING id, full_name, phone, email, status, created_at, updated_at`,
    [input.fullName.trim(), normalizedPhone, normalizedEmail, passwordHash],
  );

  const user = userResult.rows[0];

  // Create wallet account
  const accountNumber = generateAccountNumber();
  const accountResult = await query<AccountRow>(
    `INSERT INTO accounts (user_id, account_number, currency, balance, status)
     VALUES ($1, $2, 'GHS', 0.00, 'ACTIVE')
     RETURNING *`,
    [user.id, accountNumber],
  );

  return {
    user: user as Omit<UserRow, 'password_hash' | 'pin_hash'>,
    account: accountResult.rows[0],
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(input: LoginInput): Promise<{
  user: Omit<UserRow, 'password_hash' | 'pin_hash'>;
  accessToken: string;
  refreshToken: string;
}> {
  // Find user by phone or email
  const identifier = input.identifier.toLowerCase().trim();
  const isPhone = identifier.startsWith('+') || /^0[0-9]{9}$/.test(identifier);

  let userResult;
  if (isPhone) {
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeGhanaPhone(input.identifier);
    } catch {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials.');
    }
    userResult = await query<UserRow>(
      'SELECT * FROM users WHERE phone = $1',
      [normalizedPhone],
    );
  } else {
    userResult = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [identifier],
    );
  }

  const user = userResult.rows[0];

  // SECURITY: Use constant-time comparison and generic error message
  // to prevent user enumeration attacks
  if (!user) {
    // Still run bcrypt to prevent timing-based user enumeration
    await bcrypt.compare(input.password, '$2b$12$invalidhashinvalidhashinvalidhas');
    throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials.');
  }

  const passwordValid = await verifyPassword(input.password, user.password_hash);
  if (!passwordValid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid credentials.');
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('ACCOUNT_SUSPENDED', 'Your account has been suspended. Contact support.');
  }

  // Generate tokens
  const tokenPayload = { userId: user.id, phone: user.phone };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  // Return user without sensitive fields
  const { password_hash: _, pin_hash: __, ...safeUser } = user;

  return {
    user: safeUser as Omit<UserRow, 'password_hash' | 'pin_hash'>,
    accessToken,
    refreshToken,
  };
}

// ─── PIN Management ───────────────────────────────────────────────────────────

export async function setUserPin(userId: string, pin: string): Promise<void> {
  const pinHash = await hashPin(pin);

  await query(
    `UPDATE users SET pin_hash = $1, status = 'ACTIVE', updated_at = NOW()
     WHERE id = $2`,
    [pinHash, userId],
  );
}

export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  const result = await query<{ pin_hash: string }>(
    'SELECT pin_hash FROM users WHERE id = $1',
    [userId],
  );

  const user = result.rows[0];
  if (!user || !user.pin_hash) {
    throw new AppError('PIN_NOT_SET', 'Transaction PIN has not been set yet.');
  }

  return verifyPin(pin, user.pin_hash);
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
}> {
  const { verifyRefreshToken } = await import('../config/jwt');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token. Please log in again.');
  }

  // Verify user still exists and is active
  const userResult = await query<UserRow>(
    'SELECT id, phone, status FROM users WHERE id = $1',
    [payload.userId],
  );

  const user = userResult.rows[0];
  if (!user || user.status === 'SUSPENDED') {
    throw new AppError('UNAUTHORIZED', 'Account not found or suspended.');
  }

  const accessToken = signAccessToken({ userId: user.id, phone: user.phone });
  return { accessToken };
}

// ─── Get Current User ─────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string): Promise<Omit<UserRow, 'password_hash' | 'pin_hash'>> {
  const result = await query<UserRow>(
    `SELECT id, full_name, phone, email, status, pin_hash IS NOT NULL AS has_pin, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (!result.rows[0]) {
    throw new AppError('NOT_FOUND', 'User not found.');
  }

  const { password_hash: _, pin_hash: __, ...user } = result.rows[0];
  return user as Omit<UserRow, 'password_hash' | 'pin_hash'>;
}

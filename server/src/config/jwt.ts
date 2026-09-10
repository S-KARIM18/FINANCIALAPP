import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/api';

const ACCESS_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = ((process.env.JWT_ACCESS_EXPIRY || process.env.JWT_ACCESS_EXPIRES_IN) as jwt.SignOptions['expiresIn']) || '15m';
const REFRESH_EXPIRY = ((process.env.JWT_REFRESH_EXPIRY || process.env.JWT_REFRESH_EXPIRES_IN) as jwt.SignOptions['expiresIn']) || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secret environment variables (JWT_SECRET / JWT_ACCESS_SECRET and JWT_REFRESH_SECRET) are required');
}

export function signAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    ACCESS_SECRET!,
    { expiresIn: ACCESS_EXPIRY },
  );
}

export function signRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    REFRESH_SECRET!,
    { expiresIn: REFRESH_EXPIRY },
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET!) as JwtPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET!) as JwtPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

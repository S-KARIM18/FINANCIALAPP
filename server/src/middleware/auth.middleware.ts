import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { AppError } from '../utils/AppError';

/**
 * Authentication middleware.
 *
 * Verifies the JWT access token from the Authorization header.
 * Attaches the authenticated user identity to req.user.
 *
 * SECURITY: The user identity comes ONLY from the verified JWT.
 * Controllers must NEVER trust user IDs or account IDs from the request body.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Authentication required. Please log in.');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Invalid authorization header format.');
    }

    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      phone: payload.phone,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }

    // JWT verification errors (expired, invalid signature, etc.)
    // Do not leak specific JWT error details to clients
    next(new AppError('UNAUTHORIZED', 'Your session has expired. Please log in again.'));
  }
}

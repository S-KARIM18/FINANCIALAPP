import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';
import { ApiError } from '../types/api';

/**
 * Centralized error handler.
 *
 * Catches all errors passed via next(err).
 * - AppErrors are returned as structured JSON with the correct HTTP status.
 * - ZodErrors are returned as 400 VALIDATION_ERROR.
 * - Unknown errors return a generic INTERNAL_ERROR without leaking details.
 *
 * SECURITY: Stack traces and raw database errors are NEVER sent to clients.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (process.env.NODE_ENV !== 'test') {
    // Log full error server-side for observability
    console.error(`[ERROR] ${err.name}: ${err.message}`);
    if (!(err instanceof AppError)) {
      // Log stack for unexpected errors only
      console.error(err.stack);
    }
  }

  if (err instanceof z.ZodError) {
    const response: ApiError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Validation error',
        details: err.errors,
      },
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ApiError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown errors — return generic message, never expose internals
  const response: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  };
  res.status(500).json(response);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`,
    },
  };
  res.status(404).json(response);
}

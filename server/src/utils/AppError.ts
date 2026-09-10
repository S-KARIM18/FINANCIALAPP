import { ErrorCodeType, ErrorHttpStatus } from '../types/api';

/**
 * Application-level error with a structured code for consistent API responses.
 * Never expose stack traces or raw database errors to clients.
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCodeType, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ErrorHttpStatus[code];
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

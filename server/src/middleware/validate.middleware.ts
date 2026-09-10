import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Zod validation middleware factory.
 * Validates request body against a Zod schema.
 * Returns structured VALIDATION_ERROR on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(
          new AppError('VALIDATION_ERROR', 'Request validation failed.', details),
        );
      } else {
        next(err);
      }
    }
  };
}

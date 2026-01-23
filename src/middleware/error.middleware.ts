import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Should be registered last in the middleware chain
 */
export const errorHandler = (
  err: any, // Using 'any' to easily access properties like 'code' and 'meta'
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = 'An unexpected error occurred. Please try again later.';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta?.target) {
    const targetFields = (err.meta.target as string[]).join(', ');
    statusCode = 409; // Conflict
    message = `The value for the ${targetFields} field(s) already exists. Please use a different value.`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session is invalid or has expired. Please log in again.';
  } else if (err.message) {
    // Fallback for generic errors
    message = err.message;
    // Basic keyword matching for status codes
    if (message.includes('not found')) statusCode = 404;
    if (message.includes('Invalid')) statusCode = 400;
    if (message.includes('unauthorized')) statusCode = 401;
    if (message.includes('forbidden')) statusCode = 403;
  }

  // Log the original error for debugging purposes
  // Avoid logging in test environment to keep logs clean
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', {
      message: err.message,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Send a clean, user-friendly error response
  res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * 404 Not Found handler
 * Should be registered before the error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

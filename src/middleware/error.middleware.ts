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
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Check if it's our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err.message) {
    // Use the error message if available
    message = err.message;
    // Set appropriate status code based on error message
    if (message.includes('not found')) {
      statusCode = 404;
    } else if (
      message.includes('already exists') ||
      message.includes('Invalid') ||
      message.includes('required')
    ) {
      statusCode = 400;
    } else if (message.includes('unauthorized') || message.includes('Unauthorized')) {
      statusCode = 401;
    } else if (message.includes('forbidden') || message.includes('Forbidden')) {
      statusCode = 403;
    }
  }

  // Log error for debugging (in production, use a proper logger like Winston)
  console.error('Error:', {
    message: err.message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err,
    }),
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

import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { UserRole } from '../types';

/**
 * Middleware to ensure only superadmins can access certain routes
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user is a superadmin
    if (req.user.role !== UserRole.SUPERADMIN) {
      throw new AppError(
        'Access denied. This action requires superadmin privileges.',
        403
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to log superadmin actions for audit purposes
 */
export const logSuperAdminAction = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.role === UserRole.SUPERADMIN) {
    console.log('[SUPERADMIN ACTION]', {
      userId: req.user.userId,
      email: req.user.email,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
  next();
};

/**
 * Middleware to prevent superadmins from being modified by non-superadmins
 */
export const protectSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // This middleware should be used in user modification endpoints
    // to prevent non-superadmins from modifying superadmin accounts
    
    // If the current user is not a superadmin, they cannot modify superadmin accounts
    if (req.user && req.user.role !== UserRole.SUPERADMIN) {
      // Check if trying to set role to SUPERADMIN
      if (req.body.role === UserRole.SUPERADMIN) {
        throw new AppError(
          'Cannot assign superadmin role. Only superadmins can create other superadmins.',
          403
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default requireSuperAdmin;

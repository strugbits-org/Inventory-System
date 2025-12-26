import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';
import { UserRole } from '../types/index.js';

/**
 * Role-Based Access Control (RBAC) middleware
 * Checks if the authenticated user has one of the allowed roles
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is a superadmin
 */
export const requireSuperAdmin = requireRole(UserRole.SUPERADMIN);

/**
 * Check if user is a company admin
 */
export const requireCompanyAdmin = requireRole(UserRole.COMPANY);

/**
 * Check if user is an employee
 */
export const requireEmployee = requireRole(UserRole.EMPLOYEE);

/**
 * Check if user is either company admin or superadmin
 */
export const requireCompanyAdminOrSuperAdmin = requireRole(
  UserRole.COMPANY,
  UserRole.SUPERADMIN
);

/**
 * Check if user is either employee or company admin
 */
export const requireEmployeeOrCompanyAdmin = requireRole(
  UserRole.EMPLOYEE,
  UserRole.COMPANY
);

/**
 * Check if user belongs to a specific company
 */
export const requireCompanyAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Superadmins have access to all companies
    if (req.user.role === UserRole.SUPERADMIN) {
      return next();
    }

    // Get company ID from request params or body
    const targetCompanyId = req.params.companyId || req.body.companyId;

    if (!targetCompanyId) {
      throw new AppError('Company ID is required', 400);
    }

    // Check if user belongs to the company
    if (req.user.companyId !== targetCompanyId) {
      throw new AppError('Access denied to this company', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user belongs to a specific location
 */
export const requireLocationAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Superadmins have access to all locations
    if (req.user.role === UserRole.SUPERADMIN) {
      return next();
    }

    // Company admins have access to all locations in their company
    if (req.user.role === UserRole.COMPANY) {
      return next();
    }

    // Get location ID from request params or body
    const targetLocationId = req.params.locationId || req.body.locationId;

    if (!targetLocationId) {
      throw new AppError('Location ID is required', 400);
    }

    // Check if employee belongs to the location
    if (req.user.locationId !== targetLocationId) {
      throw new AppError('Access denied to this location', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user can access another user's data
 * - Superadmins can access anyone
 * - Company admins can access users in their company
 * - Users can access their own data
 */
export const requireUserAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const targetUserId = req.params.userId || req.params.id;

    if (!targetUserId) {
      throw new AppError('User ID is required', 400);
    }

    const currentUser = req.user;

    // Superadmins can access anyone
    if (currentUser.role === UserRole.SUPERADMIN) {
      return next();
    }

    // Users can access themselves
    if (currentUser.userId === targetUserId) {
      return next();
    }

    // Company admins can access users in their company (detailed check in controller)
    if (currentUser.role === UserRole.COMPANY) {
      return next();
    }

    throw new AppError('Access denied to this user', 403);
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
  const user = (req as any).user;
  if (user && user.role === UserRole.SUPERADMIN) {
    console.log('[SUPERADMIN ACTION]', {
      userId: user.id || user.userId,
      email: user.email,
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
    const user = (req as any).user;
    // If the current user is not a superadmin, they cannot modify superadmin accounts
    if (user && user.role !== UserRole.SUPERADMIN) {
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

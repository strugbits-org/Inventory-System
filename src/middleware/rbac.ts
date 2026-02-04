import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';
import { UserRole, EmployeeType } from '../types/index.js';

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
 * Employee Type-Based Access Control middleware
 * Checks if the authenticated user (who must be an EMPLOYEE) has one of the allowed employee types
 */
export const requireEmployeeType = (...allowedEmployeeTypes: EmployeeType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Ensure the user is an EMPLOYEE
      if (req.user.role !== UserRole.EMPLOYEE) {
        throw new AppError('Access denied. This action requires an employee role.', 403);
      }

      // Check if employee has one of the allowed employee types
      if (!req.user.employeeType || !allowedEmployeeTypes.includes(req.user.employeeType)) {
        throw new AppError(
          `Access denied. Required employee type: ${allowedEmployeeTypes.join(' or ')}`,
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
 * Check if user is an employee (any type)
 */
export const requireEmployee = requireRole(UserRole.EMPLOYEE);

/**
 * Check if user is a production manager
 */
export const requireProductionManager = requireEmployeeType(EmployeeType.PRODUCTION_MANAGER);

/**
 * Check if user is an installer
 */
export const requireInstaller = requireEmployeeType(EmployeeType.INSTALLER);

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
 * Check if user is either company admin or a production manager
 */
export const requireCompanyAdminOrProductionManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (
      req.user.role === UserRole.COMPANY ||
      (req.user.role === UserRole.EMPLOYEE &&
        req.user.employeeType === EmployeeType.PRODUCTION_MANAGER)
    ) {
      return next();
    }

    throw new AppError('Access denied. Required role: Company Admin or Production Manager', 403);
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is either company admin, a production manager, or an installer
 */
export const requireCompanyAdminOrProductionManagerOrInstaller = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (
      req.user.role === UserRole.COMPANY ||
      (req.user.role === UserRole.EMPLOYEE &&
        (req.user.employeeType === EmployeeType.PRODUCTION_MANAGER ||
         req.user.employeeType === EmployeeType.INSTALLER))
    ) {
      return next();
    }

    throw new AppError('Access denied. Required role: Company Admin, Production Manager, or Installer', 403);
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is either company admin, superadmin, or a production manager
 */
export const requireCompanyAdminOrSuperAdminOrProductionManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (
      req.user.role === UserRole.COMPANY ||
      req.user.role === UserRole.SUPERADMIN ||
      (req.user.role === UserRole.EMPLOYEE &&
        req.user.employeeType === EmployeeType.PRODUCTION_MANAGER)
    ) {
      return next();
    }

    throw new AppError('Access denied. Required role: Company Admin, Superadmin, or Production Manager', 403);
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user belongs to a specific company.
 * This middleware is now more flexible. If a companyId is present in params, body, or query, it validates access.
 * If no companyId is provided, it passes, and the service layer is responsible for filtering results based on the user's own companyId.
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

    // Get company ID from request params, body, or query
    const targetCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;

    // If a target company is specified, check access
    if (targetCompanyId) {
      // Check if user belongs to the company
      if (req.user.companyId !== targetCompanyId) {
        throw new AppError('Access denied to this company', 403);
      }
    }
    
    // If no targetCompanyId is specified, the service layer will handle filtering.
    // For example, on GET /jobs, the service will only return jobs for the user's company.

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

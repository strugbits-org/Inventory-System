import express from 'express';
import usersController from '../../controllers/users/users.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireCompanyAccess, requireUserAccess, requireCompanyAdminOrSuperAdmin } from '../../middleware/rbac.js';

const usersRoutes = express.Router();

// Get users by company ID (paginated) - SUPERADMIN or COMPANY admin of that company
usersRoutes.get('/company/:companyId',
  authenticateToken,
  requireCompanyAccess,
  usersController.getUsersByCompanyId
);

// Get user by ID - SUPERADMIN, COMPANY (same company), or own data
usersRoutes.get('/:id',
  authenticateToken,
  requireUserAccess,
  usersController.getUserById
);

// Create User - COMPANY ADMIN or SUPERADMIN only
usersRoutes.post('/',
  authenticateToken,
  requireCompanyAdminOrSuperAdmin,
  usersController.createUser
);

// Update User - COMPANY ADMIN or SUPERADMIN only
usersRoutes.patch('/:id',
  authenticateToken,
  requireCompanyAdminOrSuperAdmin,
  usersController.updateUser
);

// Delete User - COMPANY ADMIN or SUPERADMIN only
usersRoutes.delete('/:id',
  authenticateToken,
  requireCompanyAdminOrSuperAdmin,
  usersController.deleteUser
);

export default usersRoutes;
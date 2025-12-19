import express from 'express';
import usersController from '../controllers/users/users.controller.js';
import { authenticateToken } from '../middleware/jwtAuth.js';

const usersRoutes = express.Router();

// Get users by company ID (paginated) - SUPERADMIN or COMPANY admin of that company
usersRoutes.get('/company/:companyId', authenticateToken, usersController.getUsersByCompanyId);

// Get user by ID - SUPERADMIN, COMPANY (same company), or own data
usersRoutes.get('/:id', authenticateToken, usersController.getUserById);

export default usersRoutes;
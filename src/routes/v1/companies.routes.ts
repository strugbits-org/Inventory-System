import express from 'express';
import companiesController from '../../controllers/companies/companies.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireSuperAdmin, requireCompanyAdminOrSuperAdmin } from '../../middleware/rbac.js';

const router = express.Router();

// Create Company (Invite-based) - Public endpoint (protected by token body)
router.post('/', companiesController.createCompany);

// List Companies - Superadmin only
router.get('/', 
    // authenticateToken,
    // requireSuperAdmin, 
    companiesController.listCompanies
);

// Toggle Enable/Disable - Superadmin only
router.patch('/:id/status', authenticateToken, requireSuperAdmin, companiesController.toggleStatus);

// Get Company - Superadmin OR Company Admin
router.get('/:id', 
    authenticateToken, 
    requireCompanyAdminOrSuperAdmin, 
    companiesController.getCompany
);

// Update Company - Superadmin OR Company Admin
router.patch('/:id', authenticateToken, requireCompanyAdminOrSuperAdmin, companiesController.updateCompany);

export default router;

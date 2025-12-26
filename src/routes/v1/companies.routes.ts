import express from 'express';
import Joi from 'joi';
import companiesController from '../../controllers/companies/companies.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireSuperAdmin, requireCompanyAdminOrSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

const createCompanySchema = Joi.object({
    token: Joi.string().required(),
    companyName: Joi.string().required(),
    adminFirstName: Joi.string().required(),
    adminLastName: Joi.string().required(),
    adminPassword: Joi.string().min(6).required(),
    adminEmail: Joi.string().email().required(),
    initialLocationName: Joi.string().optional(),
});

const updateCompanySchema = Joi.object({
    name: Joi.string().optional(),
    approvedBySuperadmin: Joi.boolean().optional(),
});

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

// Create Company (Invite-based) - Public endpoint (protected by token body)
router.post('/', validate(createCompanySchema), companiesController.createCompany);

// List Companies - Superadmin only
router.get('/', 
    authenticateToken,
    requireSuperAdmin, 
    companiesController.listCompanies
);

// Toggle Enable/Disable - Superadmin only
router.patch('/:id/status', 
    authenticateToken, 
    requireSuperAdmin, 
    validate(toggleStatusSchema),
    companiesController.toggleStatus
);

// Get Company - Superadmin OR Company Admin
router.get('/:id', 
    authenticateToken, 
    requireCompanyAdminOrSuperAdmin, 
    companiesController.getCompany
);

// Update Company - Superadmin OR Company Admin
router.patch('/:id', 
    authenticateToken, 
    requireCompanyAdminOrSuperAdmin, 
    validate(updateCompanySchema),
    companiesController.updateCompany
);

export default router;


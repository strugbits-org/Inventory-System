import express from 'express';
import Joi from 'joi';
import jobsController from '../../controllers/jobs/jobs.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import {
  requireCompanyAdminOrProductionManager,
  requireCompanyAdminOrProductionManagerOrInstaller,
  requireCompanyAccess,
} from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.middleware.js';
import { JobStatus } from '@prisma/client';

const router = express.Router();

const createJobSchema = Joi.object({
  jobId: Joi.string().required(),
  clientFirstName: Joi.string().required(),
  clientLastName: Joi.string().optional(),
  clientAddress: Joi.string().required(),
  areaSqFt: Joi.number().required(),
  duration: Joi.number().required(),
  date: Joi.date().iso().required(),
  installDate: Joi.date().iso().required(),
  jobCost: Joi.number().optional(),
  jobTemplateName: Joi.string().optional(), // e.g., 'standard'
  jobMaterials: Joi.array().items(Joi.object({
    variantId: Joi.number().integer().positive().required(),
    quantityUsed: Joi.number().required(),
    cost: Joi.number().required(),
    additionalQty: Joi.number().required(),
    additionalCost: Joi.number().required(),
  })).min(1).required(),
});

const updateJobSchema = Joi.object({
  jobId: Joi.string().optional(),
  clientFirstName: Joi.string().optional(),
  clientLastName: Joi.string().optional(),
  clientAddress: Joi.string().optional(),
  areaSqFt: Joi.number().optional(),
  duration: Joi.number().optional(),
  date: Joi.date().iso().optional(),
  installDate: Joi.date().iso().optional(),
  jobCost: Joi.number().optional(),
  // To update materials, the entire new list must be provided.
  // The backend will replace the old list with this new one.
  jobMaterials: Joi.array().items(Joi.object({
    variantId: Joi.number().integer().positive().required(), // The integer ID for the material variant
    quantityUsed: Joi.number().required(),
    cost: Joi.number().required(),
    additionalQty: Joi.number().optional().default(0),
    additionalCost: Joi.number().optional().default(0),
  })).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(JobStatus)).required(),
});

const listJobsSchema = Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1),
    companyId: Joi.string().uuid(),
    status: Joi.string().valid(...Object.values(JobStatus)),
    search: Joi.string(),
    detailed: Joi.boolean(),
});

// Create Job - Company Admin or Production Manager
router.post('/', authenticateToken, requireCompanyAdminOrProductionManager, validate(createJobSchema), jobsController.createJob);

// List Jobs - Company Admin, Production Manager, or Installer (within their company)
router.get('/', authenticateToken, requireCompanyAccess, requireCompanyAdminOrProductionManagerOrInstaller, validate(listJobsSchema, 'query'), jobsController.listJobs);

// --- Archived Jobs ---
// List Archived Jobs - Company Admin, Production Manager, or Installer (within their company)
router.get('/archived', authenticateToken, requireCompanyAccess, requireCompanyAdminOrProductionManagerOrInstaller, jobsController.listArchivedJobs);

// Get Archived Job by ID - Company Admin, Production Manager, or Installer (within their company)
router.get('/archived/:id', authenticateToken, requireCompanyAccess, requireCompanyAdminOrProductionManagerOrInstaller, jobsController.getArchivedJobById);

// Get Job - Company Admin, Production Manager, or Installer (within their company)
router.get('/:id', authenticateToken, requireCompanyAccess, requireCompanyAdminOrProductionManagerOrInstaller, jobsController.getJob);

// Update Job - Company Admin or Production Manager
router.patch('/:id', authenticateToken, requireCompanyAdminOrProductionManager, validate(updateJobSchema), jobsController.updateJob);

// Update Job Status - Company Admin, Production Manager, or Installer
router.patch('/:id/status', authenticateToken, requireCompanyAdminOrProductionManagerOrInstaller, validate(updateStatusSchema), jobsController.updateStatus);

// Archive Job (Soft Delete) - Company Admin or Production Manager
router.delete('/:id', authenticateToken, requireCompanyAdminOrProductionManager, jobsController.archiveJob);

export default router;


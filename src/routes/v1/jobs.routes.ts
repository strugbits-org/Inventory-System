import express from 'express';
import Joi from 'joi';
import jobsController from '../../controllers/jobs/jobs.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireCompanyAdmin } from '../../middleware/rbac.js';
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
  locationId: Joi.string().required(),
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
  locationId: Joi.string().optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(JobStatus)).required(),
});

// Create Job - Company Admin only
router.post('/', authenticateToken, requireCompanyAdmin, validate(createJobSchema), jobsController.createJob);

// List Jobs - Authenticated users (Filter logic in service)
router.get('/', authenticateToken, jobsController.listJobs);

// Get Job - Authenticated users (Filter logic in service)
router.get('/:id', authenticateToken, jobsController.getJob);

// Update Job - Company Admin only
router.patch('/:id', authenticateToken, requireCompanyAdmin, validate(updateJobSchema), jobsController.updateJob);

// Update Job Status - Company Admin only
router.patch('/:id/status', authenticateToken, requireCompanyAdmin, validate(updateStatusSchema), jobsController.updateStatus);

export default router;


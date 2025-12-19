import express from 'express';
import jobsController from '../../controllers/jobs/jobs.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireCompanyAdmin } from '../../middleware/rbac.js';

const router = express.Router();

// Create Job - Company Admin only
router.post('/', authenticateToken, requireCompanyAdmin, jobsController.createJob);

// List Jobs - Authenticated users (Filter logic in service)
router.get('/', authenticateToken, jobsController.listJobs);

// Get Job - Authenticated users (Filter logic in service)
router.get('/:id', authenticateToken, jobsController.getJob);

// Update Job - Company Admin only
router.patch('/:id', authenticateToken, requireCompanyAdmin, jobsController.updateJob);

// Update Job Status - Company Admin only
router.patch('/:id/status', authenticateToken, requireCompanyAdmin, jobsController.updateStatus);

export default router;

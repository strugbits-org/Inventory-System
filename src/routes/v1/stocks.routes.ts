import express from 'express';
import Joi from 'joi';
import stocksController from '../../controllers/stocks/stocks.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireCompanyAdmin, requireEmployeeOrCompanyAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

const projectionSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required().min(Joi.ref('start_date')),
});

const stockUpsertSchema = Joi.object({
  variantId: Joi.number().integer().positive().required(),
  inStock: Joi.number().min(0).required(),
});

// Get stock projection for a date range
router.get('/projection', authenticateToken, requireEmployeeOrCompanyAdmin, validate(projectionSchema, 'query'), stocksController.getStockProjection);

// Upsert stock quantity for a user's location
router.post('/', authenticateToken, requireCompanyAdmin, validate(stockUpsertSchema), stocksController.updateStock);

export default router;

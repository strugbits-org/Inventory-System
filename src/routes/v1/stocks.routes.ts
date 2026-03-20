import express from 'express';
import Joi from 'joi';
import stocksController from '../../controllers/stocks/stocks.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import {
  requireCompanyAdminOrSuperAdmin,
  requireEmployeeOrCompanyAdmin,
  requireCompanyAdminOrSuperAdminOrProductionManager
} from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

const projectionSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().required().min(Joi.ref('start_date')),
  companyId: Joi.string().uuid().optional(),
});

const stockUpsertSchema = Joi.object({
  variantId: Joi.number().integer().positive().required(),
  inStock: Joi.number().min(0).required(),
  companyId: Joi.string().uuid().optional(),
});

const emailManufacturerSchema = Joi.object({
  fromEmail: Joi.string().email().required(),
  subject: Joi.string().required(),
  message: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      variantId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
      variantName: Joi.string().required(),
      materialName: Joi.string().required(),
      quantityNeeded: Joi.number().required(),
      color: Joi.string().optional().allow('', null),
    })
  ).required(),
});

// Get stock projection for a date range
router.get('/projection', authenticateToken, requireEmployeeOrCompanyAdmin, validate(projectionSchema, 'query'), stocksController.getStockProjection);

// Upsert stock quantity for a user's location
router.post('/', authenticateToken, requireCompanyAdminOrSuperAdminOrProductionManager, validate(stockUpsertSchema), stocksController.updateStock);

// Email manufacturer for restocking
router.post('/email-manufacturer', authenticateToken, requireCompanyAdminOrSuperAdminOrProductionManager, validate(emailManufacturerSchema), stocksController.emailManufacturer);

export default router;

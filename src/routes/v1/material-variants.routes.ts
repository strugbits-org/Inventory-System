import express from 'express';
import Joi from 'joi';
import multer from 'multer';
import materialVariantController from '../../controllers/materials/material-variants.controller.js';
import { requireSuperAdmin } from '../../middleware/rbac.js'; // Using rbac.ts instead of superadmin.ts
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

// Multer setup for file uploads
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(null, false); // Reject non-CSV
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const createVariantSchema = Joi.object({
    name: Joi.string().required(),
    color: Joi.string().optional().allow(null, ''),
    type: Joi.string().optional().allow(null, ''),
    pricePerGallon: Joi.number().min(0).required(),
    coverageArea: Joi.number().min(0).required(),
    overageRate: Joi.number().min(0).required(),
});

const updateVariantSchema = Joi.object({
    name: Joi.string().optional(),
    color: Joi.string().optional().allow(null, ''),
    type: Joi.string().optional().allow(null, ''),
    pricePerGallon: Joi.number().min(0).optional(),
    coverageArea: Joi.number().min(0).optional(),
    overageRate: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
});

const updateStockSchema = Joi.object({
    inStock: Joi.number().min(0).required(),
    locationId: Joi.string().optional()
});

const usageForecastSchema = Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    locationId: Joi.string().optional()
});

// Material specific routes (Superadmin only for mutations)
router.post('/:materialId/variants', authenticateToken, requireSuperAdmin, validate(createVariantSchema), materialVariantController.createVariant);
router.get('/:materialId/variants', authenticateToken, materialVariantController.getVariants);

// Variant ID routes (now under /variants)
router.get('/variants/:id', authenticateToken, materialVariantController.getVariantById);
router.put('/variants/:id', authenticateToken, requireSuperAdmin, validate(updateVariantSchema), materialVariantController.updateVariant);
router.delete('/variants/:id', authenticateToken, requireSuperAdmin, materialVariantController.deleteVariant);

// Update stock for a variant
router.patch('/variants/:id/stock', authenticateToken, validate(updateStockSchema), materialVariantController.updateStock);
router.get('/variants/:id/stock', authenticateToken, materialVariantController.getStock);

// Get usage forecast
router.get('/usage-forecast', authenticateToken, validate(usageForecastSchema, 'query'), materialVariantController.getUsageForecast);

// Import route (Superadmin only)
router.post(
    '/import', 
    authenticateToken,
    requireSuperAdmin,
    upload.single('file'), 
    (req, res, next) => {
        if (!req.file) {    
            return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
        }
        next();
    },
    materialVariantController.importVariants
);

export default router;


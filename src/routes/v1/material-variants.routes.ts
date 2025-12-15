import express from 'express';
import multer from 'multer';
import materialVariantController from '../../controllers/materials/material-variants.controller.js';
import { requireSuperAdmin } from '../../middleware/superadmin.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';

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

// Apply auth middleware to all routes
// router.use(authenticateToken);
// router.use(requireSuperAdmin);

// Material specific routes
router.post('/materials/:materialId/variants', materialVariantController.createVariant);
router.get('/materials/:materialId/variants', materialVariantController.getVariants);

// Variant ID routes
router.get('/material-variants/:id', materialVariantController.getVariantById);
router.put('/material-variants/:id', materialVariantController.updateVariant);
router.delete('/material-variants/:id', materialVariantController.deleteVariant);

// Import route
router.post(
    '/material-variants/import', 
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

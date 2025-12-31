import express from 'express';
import Joi from 'joi';
import profileController from '../../controllers/profile/profile.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

const updateProfileSchema = Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().allow('').optional(),
    address: Joi.string().allow('').optional(),
    password: Joi.string().min(6).optional(),
});

// Get Profile
router.get('/', 
    authenticateToken,
    profileController.getProfile
);

// Update Profile
router.patch('/', 
    authenticateToken,
    validate(updateProfileSchema),
    profileController.updateProfile
);

export default router;

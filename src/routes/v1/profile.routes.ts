import express from 'express';
import Joi from 'joi';
import profileController from '../../controllers/profile/profile.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireEmployeeOrCompanyAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         email:
 *           type: string
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           example: "123-456-7890"
 *         address:
 *           type: string
 *           example: "123 Main St, Anytown, USA"
 *         profileImage:
 *           type: string
 *           format: uri
 *           example: "https://example-bucket.s3.region.amazonaws.com/avatars/user-123.jpg"
 *         role:
 *           type: string
 *           enum: [SUPERADMIN, COMPANY, EMPLOYEE]
 *           example: "COMPANY"
 *
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         address:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *         profileImage:
 *           type: string
 *           format: "data-uri"
 *           description: "Base64 encoded data URI of the image (e.g., 'data:image/jpeg;base64,/9j/4AAQSkZJRg...')"
 */

const updateProfileSchema = Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().allow('').optional(),
    address: Joi.string().allow('').optional(),
    password: Joi.string().min(6).optional(),
    profileImage: Joi.string().optional(),
});

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/',
    authenticateToken,
    requireEmployeeOrCompanyAdmin,
    profileController.getProfile
);

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Bad request (e.g., validation error)
 *       401:
 *         description: Unauthorized
 */
router.patch('/',
    authenticateToken,
    requireEmployeeOrCompanyAdmin,
    validate(updateProfileSchema),
    profileController.updateProfile
);

export default router;

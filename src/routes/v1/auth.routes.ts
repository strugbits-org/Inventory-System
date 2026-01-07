import express from "express";
import Joi from "joi";
import authController from '../../controllers/auth/auth.controller.js';
import { validate } from "../../middleware/validation.middleware.js";
import { authenticateToken } from "../../middleware/jwtAuth.js";

const authRoutes = express.Router();

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

/**
 * Public routes - no authentication required
 */

// Login route
authRoutes.post('/login', validate(loginSchema), authController.login);

// Refresh token route
authRoutes.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// Logout route
authRoutes.post('/logout', authenticateToken, authController.logout);

export default authRoutes;


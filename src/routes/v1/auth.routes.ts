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

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().min(6).required(),
});

/**
 * Public routes - no authentication required
 */

// Login route
authRoutes.post('/login', validate(loginSchema), authController.login);

// Refresh token route
authRoutes.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// Forgot password route
authRoutes.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

// Reset password route
authRoutes.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Logout route
authRoutes.post('/logout', authenticateToken, authController.logout);

export default authRoutes;


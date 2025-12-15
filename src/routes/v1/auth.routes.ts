import express from "express";
import authController from '../../controllers/auth/auth.controller';

const authRoutes = express.Router();

/**
 * Public routes - no authentication required
 */

// Login route
authRoutes.post('/login', authController.login);

export default authRoutes;

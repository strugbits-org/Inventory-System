import { Request, Response, NextFunction } from 'express';
import AuthService from '../../services/auth/auth.service.js';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class AuthController {
    private authService: AuthService;

    constructor(authService: AuthService = new AuthService()) {
        this.authService = authService;
    }

    /**
     * @openapi
     * /auth/login:
     *   post:
     *     summary: Login user
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, password]
     *             properties:
     *               email:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     */
    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);

            return res.status(200).json(ApiResponse.success(result, 'Login successful'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * @openapi
     * /auth/logout:
     *   post:
     *     summary: Logout user
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: Logged out successfully
     */
    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            const accessToken = authHeader && authHeader.split(' ')[1];
            const { refreshToken } = req.body;

            if (!accessToken) {
                throw new AppError('Access token is required', 400);
            }

            await this.authService.logout(accessToken, refreshToken);

            return res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * @openapi
     * /auth/refresh:
     *   post:
     *     summary: Refresh access and refresh tokens
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [refreshToken]
     *             properties:
     *               refreshToken:
     *                 type: string
     *                 description: Current refresh token
     *     responses:
     *       200:
     *         description: Tokens refreshed successfully
     *       401:
     *         description: Invalid or expired refresh token
     */
    refresh = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refreshToken(refreshToken);

            return res.status(200).json(ApiResponse.success(result, 'Tokens refreshed successfully'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * @openapi
     * /auth/forgot-password:
     *   post:
     *     summary: Request password reset link
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User email address
     *     responses:
     *       200:
     *         description: Password reset email sent
     *       400:
     *         description: Invalid email
     */
    forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            const result = await this.authService.forgotPassword(email);

            return res.status(200).json(ApiResponse.success(null, result.message));
        } catch (error) {
            next(error);
        }
    }

    /**
     * @openapi
     * /auth/reset-password:
     *   post:
     *     summary: Reset password with token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [token, password, confirmPassword]
     *             properties:
     *               token:
     *                 type: string
     *                 description: Password reset token from email
     *               password:
     *                 type: string
     *                 format: password
     *                 description: New password (min 6 characters)
     *               confirmPassword:
     *                 type: string
     *                 format: password
     *                 description: Confirm new password
     *     responses:
     *       200:
     *         description: Password reset successful
     *       400:
     *         description: Invalid token or passwords don't match
     */
    resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, password, confirmPassword } = req.body;
            const result = await this.authService.resetPassword(token, password, confirmPassword);

            return res.status(200).json(ApiResponse.success(null, result.message));
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();

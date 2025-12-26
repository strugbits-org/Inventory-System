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
}

export default new AuthController();

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import AuthService from '../../services/auth/auth.service';

class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    /**
     * POST /auth/login
     * Login user with email and password
     */
    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Check if request body exists
            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Request body is required',
                });
            }

            const schema = Joi.object({
                email: Joi.string().email().required(),
                password: Joi.string().required(),
            });

            const { error, value } = schema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.details.map((detail) => detail.message),
                });
            }

            // Additional safety check for value object
            if (!value || !value.email || !value.password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required',
                });
            }

            const result = await this.authService.login(value.email, value.password);

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
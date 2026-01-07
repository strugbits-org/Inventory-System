import UsersService from '../users/users.service.js';
import { prisma } from '../../db/db.service.js';
import JwtService from '../jwt/jwt.service.js';
import { comparePassword } from '../../utils/helpers.js';

interface LoginResponse {
    userId: string;
    accessToken: string;
    refreshToken: string;
    user: any;
}

class AuthService {
    private usersService: UsersService;
    private jwtService: JwtService;

    constructor() {
        this.usersService = new UsersService();
        this.jwtService = new JwtService();
    }

    /**
     * Login user with email and password
     * @param email User email
     * @param password User password
     * @returns User ID, tokens, and user details
     * @throws Error if validation fails or credentials are invalid
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            throw new Error('Invalid email or password');
        }

        // Validate password
        if (!password || password.trim().length === 0) {
            throw new Error('Invalid email or password');
        }

        // Find user by email with company and location
        const user = await prisma.user.findFirst({
            where: { email },
            include: {
                company: true,
                location: true
            }
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if company is disabled
        if (user.companyId && user.company) {
            if (!user.company.isActive) {
                throw new Error('Company account is disabled. Please contact support.');
            }
        }

        // Compare password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate tokens
        const tokens = await this.jwtService.createTokens(user);

        // Remove password from user object before returning
        const { password: _, ...userWithoutPassword } = user;

        return {
            ...tokens,
            user: userWithoutPassword
        };
    }

    /**
     * Logout user by blacklisting tokens
     */
    async logout(accessToken: string, refreshToken?: string): Promise<boolean> {
        // Blacklist access token
        const accessExpiry = this.jwtService.getTokenExpiry(accessToken, 24);

        await prisma.tokenBlacklist.create({
            data: {
                token: accessToken,
                expiresAt: accessExpiry,
                reason: 'Logout',
            },
        });

        // Blacklist refresh token if provided
        if (refreshToken) {
            const refreshExpiry = this.jwtService.getTokenExpiry(refreshToken, 168); // 7 days

            await prisma.tokenBlacklist.create({
                data: {
                    token: refreshToken,
                    expiresAt: refreshExpiry,
                    reason: 'Logout',
                },
            });
        }

        return true;
    }

    /**
     * Refresh access and refresh tokens
     * @param refreshToken Current refresh token
     * @returns New access token and refresh token
     * @throws Error if token is invalid, expired, or blacklisted
     */
    async refreshToken(refreshToken: string): Promise<LoginResponse> {
        // Validate refresh token format
        if (!refreshToken || refreshToken.trim().length === 0) {
            throw new Error('Refresh token is required');
        }

        // Check if token is blacklisted
        const isBlacklisted = await prisma.tokenBlacklist.findUnique({
            where: { token: refreshToken },
        });

        if (isBlacklisted) {
            throw new Error('Refresh token has been revoked');
        }

        // Verify and decode refresh token
        const decoded = this.jwtService.verifyRefreshToken(refreshToken);

        // Fetch fresh user data from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                company: true,
                location: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('User account is disabled');
        }

        // Check if company is active
        if (user.companyId && user.company) {
            if (!user.company.isActive) {
                throw new Error('Company account is disabled. Please contact support.');
            }
        }

        // Blacklist old refresh token (token rotation for security)
        const refreshExpiry = this.jwtService.getTokenExpiry(refreshToken, 168); // 7 days

        await prisma.tokenBlacklist.create({
            data: {
                token: refreshToken,
                expiresAt: refreshExpiry,
                reason: 'Token refresh',
            },
        });

        // Generate new tokens
        const tokens = await this.jwtService.createTokens(user);

        // Remove password from user object before returning
        const { password: _, ...userWithoutPassword } = user;

        return {
            ...tokens,
            user: userWithoutPassword
        };
    }

    /**
     * Forgot password - Send reset link to email
     * @param email User email
     * @returns Success message
     * @throws Error if user not found
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            throw new Error('Invalid email address');
        }

        // Find user by email
        const user = await prisma.user.findFirst({
            where: { email },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true
            }
        });

        if (!user) {
            throw new Error('If this email exists in our system, you will receive a password reset link');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('Account is disabled. Please contact support.');
        }

        // Generate password reset token (1 hour expiry)
        const resetToken = this.jwtService.generatePasswordResetToken(user.id, user.email);

        // Create reset link
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        // Send email
        const { sendForgotPasswordEmail } = await import('../../utils/email.util.js');
        await sendForgotPasswordEmail({
            to: user.email,
            name: `${user.firstName} ${user.lastName}`,
            resetLink,
            expiresInMinutes: 60
        });

        return {
            message: 'If this email exists in our system, you will receive a password reset link'
        };
    }

    /**
     * Reset password with token
     * @param token Password reset token
     * @param newPassword New password
     * @param confirmPassword Confirm password
     * @returns Success message
     * @throws Error if token invalid or passwords don't match
     */
    async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> {
        // Validate token
        if (!token || token.trim().length === 0) {
            throw new Error('Reset token is required');
        }

        // Validate passwords
        if (!newPassword || newPassword.trim().length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (newPassword !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        // Verify token
        const decoded = this.jwtService.verifyPasswordResetToken(token);

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, isActive: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('Account is disabled. Please contact support.');
        }

        // Hash new password
        const { hashPassword } = await import('../../utils/helpers.js');
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        return {
            message: 'Password reset successful. You can now login with your new password.'
        };
    }
}

export default AuthService;
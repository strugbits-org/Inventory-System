import { User, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/**
 * JWT Payload structure for tokens
 * CompanyId is now REQUIRED for all token generation
 */
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    companyId: string;
    locationId?: string;
}

interface TokenResponse {
    userId: string;
    accessToken: string;
    refreshToken: string;
}

class JwtService {
    /**
     * Generate access token
     * @param payload JWT payload with required companyId
     * @returns Access token (one day expiry)
     */
    generateAccessToken(payload: JwtPayload): string {
        return jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        } as jwt.SignOptions);
    }

    /**
     * Generate refresh token
     * @param payload JWT payload with required companyId
     * @returns Refresh token (7 days expiry)
     */
    generateRefreshToken(payload: JwtPayload): string {
        return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);
    }

    /**
     * Verify refresh token
     * @param token Refresh token to verify
     * @returns Decoded JWT payload
     * @throws Error if token is invalid or expired
     */
    verifyRefreshToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid refresh token');
            } else if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Refresh token has expired');
            }
            throw error;
        }
    }

    /**
     * Decode token without verification (used for getting expiry)
     * @param token JWT token to decode
     * @returns Decoded token payload
     */
    decodeToken(token: string): any {
        return jwt.decode(token);
    }

    /**
     * Get token expiry date
     * @param token JWT token
     * @param defaultHours Default hours to add if no expiry found
     * @returns Expiry date
     */
    getTokenExpiry(token: string, defaultHours: number = 24): Date {
        const decoded = this.decodeToken(token);
        if (decoded?.exp) {
            return new Date(decoded.exp * 1000);
        }
        return new Date(Date.now() + defaultHours * 60 * 60 * 1000);
    }

    /**
     * Create access and refresh tokens for a user
     * @param user User object from database
     * @returns Object containing userId, accessToken (one day), and refreshToken (7 days)
     * @throws Error if user doesn't have companyId
     */
    async createTokens(user: User): Promise<TokenResponse> {
        // Validate companyId is present
        if (!user.companyId) {
            throw new Error('Company ID is required for token generation');
        }

        const payload: JwtPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            locationId: user.locationId || undefined,
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);

        return {
            userId: user.id,
            accessToken,
            refreshToken,
        };
    }
}

export default JwtService;

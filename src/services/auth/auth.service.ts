import UsersService from '../user/users.service.js';
import { prisma } from '../../db/db.service.js';
import JwtService from '../jwt/jwt.service.js';
import { comparePassword } from '../../utils/helpers.js';

interface LoginResponse {
    userId: string;
    accessToken: string;
    refreshToken: string;
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
     * @returns User ID with access and refresh tokens
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

        // Find user by email
        const user = await this.usersService.getUserByEmail(email);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if company is disabled
        if (user.companyId) {
            const company = await prisma.company.findUnique({
                where: { id: user.companyId },
                select: { isActive: true }
            });

            if (company && !company.isActive) {
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

        return tokens;
    }
}

export default AuthService;
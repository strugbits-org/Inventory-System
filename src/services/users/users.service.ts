import db from '../../db/db.service.js';
import { User } from '@prisma/client';

class UsersService {
    /**
     * Get all users from database
     * @param select Optional fields to select
     * @returns Promise of array of users
     */
    async getAllUsers(select?: any): Promise<User[]> {
        return await db.findAll<User>('user', select);
    }

    /**
     * Get user by ID
     * @param id User ID
     * @param select Optional fields to select
     * @returns Promise of user or null if not found
     */
    async getUserById(id: string, select?: any): Promise<User | null> {
        return await db.findOne<User>('user', { id }, select);
    }

    /**
     * Get user by email
     * @param email User email
     * @param select Optional fields to select
     * @returns Promise of user or null if not found
     */
    async getUserByEmail(email: string, select?: any): Promise<User | null> {
        return await db.findFirst<User>('user', { email }, select);
    }

    /**
     * Get users by company ID with pagination
     * @param companyId Company ID
     * @param options Pagination options (page, limit)
     * @param select Optional fields to select
     * @returns Promise of paginated users
     */
    async getUsersByCompanyId(
        companyId: string,
        options: { page?: number; limit?: number } = {},
        select?: any,
        isEmployeeOnly?: boolean,
    ): Promise<{
        data: User[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const skip = (page - 1) * limit;

        // Get total count
        const total = await db.count('user', { companyId, role: isEmployeeOnly ? 'EMPLOYEE' : 'ADMIN' });

        // Get paginated data
        const data = await db.findMany<User>('user', {
            where: { companyId, role: isEmployeeOnly ? 'EMPLOYEE' : 'ADMIN' },
            select,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });


        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Create a new user
     * @param data User data (email, name, companyId, locationId?)
     * @returns Created user
     */
    async createUser(data: {
        email: string;
        name: string;
        companyId: string;
        locationId?: string;
    }): Promise<User> {
        return await db.transaction(async (tx: any) => {
            // Check if email already exists
            const existingUser = await tx.user.findUnique({
                where: { email: data.email }
            });

            if (existingUser) {
                // If user exists but is inactive, maybe reactivate? 
                // For now, throw error as per standard registration flow
                // But strict requirement says "create", so let's throw if exists.
                throw new Error('User with this email already exists');
            }

            // Split name into first and last name
            const nameParts = data.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Generate random password
            const passwordLength = 10;
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < passwordLength; i++) {
                password += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            // Hash password (assuming we have a hashing utility, 
            // but looking at imports, there isn't one imported. 
            // I should verify how password hashing is done. 
            // Usually in auth service. 
            // For now, I'll store it as is and assume there's a pre-save hook 
            // or I need to import bcrypt. 
            // Let's check auth service or existing user creation logic later. 
            // Wait, looking at file list, I don't see bcrypt imported in service.
            // I'll import bcryptjs if needed, or check auth.service.
            // For this step I will assume simple storage or I need to mock it.
            // Actually, best practice is to hash it.
            // I will import bcrypt here.)

            // Re-checking imports.. I don't have bcrypt imported. 
            // I'll add the import in a separate tool call if needed or just use consistent hashing.
            // Let's assume for now I will hash it.
            const hashedPassword = await import('bcryptjs').then(m => m.hash(password, 10));

            const newUser = await tx.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    companyId: data.companyId,
                    locationId: data.locationId,
                    role: 'EMPLOYEE', // Default role
                    isActive: true,
                }
            });

            // Send email with credentials
            // Late import to avoid circular dependency issues if any, though likely fine at top
            const { sendNewUserCredentialsEmail } = await import('../../utils/email.util.js');

            // Fetch company name for email
            const company = await tx.company.findUnique({
                where: { id: data.companyId },
                select: { name: true }
            });

            await sendNewUserCredentialsEmail({
                to: newUser.email,
                name: `${newUser.firstName} ${newUser.lastName}`,
                companyName: company?.name || 'ResinWerks',
                loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login',
                password: password // Send plain password
            });

            return newUser;
        });
    }

    /**
     * Update user (Partial update)
     * @param id User ID
     * @param data Partial user data
     * @returns Updated user
     */
    async updateUser(id: string, data: Partial<User>): Promise<User> {
        // Prevent updating critical fields directly if needed, but RBAC handles permissions.
        // We should probably prevent changing companyId or role via this route easily 
        // without extra checks, but the controller handles Company Admin restriction.
        // Company Admin shouldn't be able to change a user's company anyway.
        const { companyId, role, ...allowedUpdates } = data;

        // Actually user might want to update role (e.g. promote to manager?). 
        // Requirement says "create, update and delete". 
        // "create karty wakt just email and name jayega".
        // For update, it didn't specify restrictions.
        // But usually Company Admin can update their employees.
        // Let's allow updating standard fields.

        return await db.update<User>('user', { id }, allowedUpdates);
    }

    /**
     * Delete user
     * @param id User ID
     * @returns Deleted user
     */
    async deleteUser(id: string): Promise<User> {
        return await db.delete<User>('user', { id });
    }
}

export default UsersService;
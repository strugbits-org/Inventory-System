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
        select?: any
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
        const total = await db.count('user', { companyId });

        // Get paginated data
        const data = await db.findMany<User>('user', {
            where: { companyId },
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
}

export default UsersService;
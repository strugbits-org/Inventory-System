import db from '../../db/db.service';
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
}

export default UsersService;
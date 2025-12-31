import { prisma } from '../../db/db.service.js';
import { hashPassword } from '../../utils/helpers.js';
import { User } from '@prisma/client';

export class ProfileService {
    /**
     * Get user profile by ID
     */
    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                role: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: Partial<User> & { password?: string }) {
        const { password, ...profileData } = data;

        if (password) {
            const hashedPassword = await hashPassword(password);
            profileData.password = hashedPassword;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: profileData,
            select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                role: true,
            },
        });

        return updatedUser;
    }
}

export default new ProfileService();

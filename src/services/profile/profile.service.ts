import { prisma } from '../../db/db.service.js';
import { hashPassword } from '../../utils/helpers.js';
import { processProfileImage } from '../../utils/image.util.js';
import { env } from '../../config/env.js';

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
                profileImage: true,
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
    async updateProfile(userId: string, data: any) {
        const { password, profileImage, ...profileData } = data;

        // Handle password update
        if (password) {
            const hashedPassword = await hashPassword(password);
            profileData.password = hashedPassword;
        }

        // Handle profile image update
        if (profileImage) {
            try {
                const serverUrl = `${env.BACKEND_URL}`; // Use backend URL for uploads
                const imageUrl = await processProfileImage(userId, profileImage, serverUrl);
                profileData.profileImage = imageUrl;
            } catch (error: any) {
                throw new Error(`Image upload failed: ${error.message}`);
            }
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
                profileImage: true,
                role: true,
            },
        });

        return updatedUser;
    }
}

export default new ProfileService();

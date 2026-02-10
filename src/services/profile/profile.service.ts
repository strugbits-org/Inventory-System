import { prisma } from '../../db/db.service.js';
import { hashPassword } from '../../utils/helpers.js';
import { deleteFromS3, uploadBase64ToS3, uploadMulterFileToS3, getPreSignedUrl } from '../../utils/s3.util.js';
import crypto from 'crypto';

export class ProfileService {
    /**
     * Get user profile by ID
     */
    async getProfile(userId: string) {
        let user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                profileImage: true,
                companyId: true,
                role: true,
                employeeType: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.profileImage) {
            const key = user.profileImage.split('/').pop();
            if (key) {
                user.profileImage = await getPreSignedUrl(key);
            }
        }

        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: any) {
        const { password, profileImage, ...profileData } = data;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // Handle password update
        if (password) {
            const hashedPassword = await hashPassword(password);
            profileData.password = hashedPassword;
        }

        // Handle profile image update from base64 string
        if (profileImage) {
            // If user has an old profile image, delete it from S3
            if (user.profileImage) {
                try {
                    // Extract key from URL
                    const key = user.profileImage.split('/').pop();
                    if (key) {
                        await deleteFromS3(key);
                    }
                } catch (error) {
                    // Log error but don't block update
                    console.error(`Failed to delete old profile image from S3: ${error}`);
                }
            }
            const matches = profileImage.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            const extension = matches ? matches[1] : 'jpg';
            const newFileName = `${userId}-${crypto.randomBytes(16).toString('hex')}.${extension}`;
            const imageUrl = await uploadBase64ToS3(profileImage, newFileName);
            profileData.profileImage = imageUrl;
        }


        let updatedUser = await prisma.user.update({
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

        if (updatedUser.profileImage) {
            const key = updatedUser.profileImage.split('/').pop();
            if (key) {
                updatedUser.profileImage = await getPreSignedUrl(key);
            }
        }

        return updatedUser;
    }

    /**
     * Update user profile image
     */
    async updateProfileImage(userId: string, file: Express.Multer.File) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // If user has an old profile image, delete it from S3
        if (user.profileImage) {
            try {
                // Extract key from URL
                const key = user.profileImage.split('/').pop();
                if (key) {
                    await deleteFromS3(key);
                }
            } catch (error) {
                // Log error but don't block update
                console.error(`Failed to delete old profile image from S3: ${error}`);
            }
        }

        // Upload new image to S3
        const fileExtension = file.originalname.split('.').pop();
        const newFileName = `${userId}-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
        const imageUrl = await uploadMulterFileToS3(file, newFileName);

        // Update user's profileImage URL
        let updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profileImage: imageUrl },
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

        if (updatedUser.profileImage) {
            const key = updatedUser.profileImage.split('/').pop();
            if (key) {
                updatedUser.profileImage = await getPreSignedUrl(key);
            }
        }

        return updatedUser;
    }
}

export default new ProfileService();

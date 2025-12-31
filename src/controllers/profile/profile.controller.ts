import { Request, Response, NextFunction } from 'express';
import profileService, { ProfileService } from '../../services/profile/profile.service.js';
import ApiResponse from '../../utils/response.js';

class ProfileController {
    private profileService: ProfileService;

    constructor(profileServiceInstance: ProfileService = profileService) {
        this.profileService = profileServiceInstance;
    }

    /**
     * Get current user's profile
     */
    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            const userProfile = await this.profileService.getProfile(user.userId);
            return res.status(200).json(ApiResponse.success(userProfile));
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Update current user's profile
     */
    updateProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            const updatedUser = await this.profileService.updateProfile(user.userId, req.body);
            return res.status(200).json(ApiResponse.success(updatedUser, 'Profile updated successfully'));
        } catch (error: any) {
            next(error);
        }
    }
}

export default new ProfileController();

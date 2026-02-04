import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';
import overrideServiceInstance, { OverrideService } from '../../services/overrides/overrides.service.js';

class OverridesController {
  private overrideService: OverrideService;

  constructor(overrideService: OverrideService = overrideServiceInstance) {
    this.overrideService = overrideService;
  }

  /**
   * Create or Update a Company Overage Override
   * Route: POST /overrides
   */
  createOrUpdateOverride = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { variantId, overageRate } = req.body;

      if (!user || !user.companyId) {
        throw new AppError('User is not associated with a company or not authenticated.', 400);
      }

      const result = await this.overrideService.createOrUpdateOverride({
        companyId: user.companyId,
        variantId, // The integer ID
        overageRate,
      });

      return res.status(200).json(ApiResponse.success(result, 'Overage override saved successfully'));
    } catch (error: any) {
      next(error);
    }
  }
}

export default new OverridesController();

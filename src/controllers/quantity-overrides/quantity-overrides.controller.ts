import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';
import quantityOverrideServiceInstance, { QuantityOverrideService } from '../../services/quantity-overrides/quantity-overrides.service.js';

class QuantityOverridesController {
  private quantityOverrideService: QuantityOverrideService;

  constructor(quantityOverrideService: QuantityOverrideService = quantityOverrideServiceInstance) {
    this.quantityOverrideService = quantityOverrideService;
  }

  /**
   * Create or Update a Company Quantity Override
   * Route: POST /quantity-overrides
   */
  createOrUpdateOverride = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { variantId, quantity } = req.body;

      if (!user || !user.companyId) {
        throw new AppError('User is not associated with a company or not authenticated.', 400);
      }

      const result = await this.quantityOverrideService.createOrUpdateOverride({
        companyId: user.companyId,
        variantId, // The integer ID
        quantity,
      });

      return res.status(200).json(ApiResponse.success(result, 'Quantity override saved successfully'));
    } catch (error: any) {
      next(error);
    }
  }
}

export default new QuantityOverridesController();

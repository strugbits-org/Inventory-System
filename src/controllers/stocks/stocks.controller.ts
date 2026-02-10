import { Request, Response, NextFunction } from 'express';
import stocksServiceInstance, { StocksService } from '../../services/stocks/stocks.service.js';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class StocksController {
  private stocksService: StocksService;

  constructor(stocksService: StocksService = stocksServiceInstance) {
    this.stocksService = stocksService;
  }

  /**
   * Get Stock Projection
   * Route: GET /stocks/projection
   */
  getStockProjection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { start_date, end_date, companyId, page, limit } = req.query;

      if (!user) {
        throw new AppError('Authentication required.', 401);
      }

      const isSuperAdmin = user.role === 'SUPERADMIN';
      const targetCompanyId = isSuperAdmin ? (companyId as string) : user.companyId;

      if (!targetCompanyId) {
        if (isSuperAdmin) {
          return res.status(200).json(ApiResponse.success([]));
        }
        throw new AppError('User not associated with a company.', 401);
      }

      const result = await this.stocksService.getStockProjection({
        companyId: targetCompanyId,
        startDate: new Date(start_date as string),
        endDate: new Date(end_date as string),
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });

      return res.status(200).json(ApiResponse.paginated(result.data, result.meta));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update Stock
   * Route: PUT /stocks/:id
   */
  updateStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { variantId, inStock, companyId } = req.body;
      const user = (req as any).user;

      if (!user) {
        throw new AppError('Authentication required.', 401);
      }

      const isSuperAdmin = user.role === 'SUPERADMIN';
      const targetCompanyId = isSuperAdmin ? (companyId || user.companyId) : user.companyId;

      if (!targetCompanyId) {
        throw new AppError('Company ID is required for stock updates.', 400);
      }

      const upsertedStock = await this.stocksService.updateStock({
        user: { companyId: targetCompanyId },
        variantId,
        inStock,
      });

      return res.status(200).json(ApiResponse.success(upsertedStock, 'Stock quantity updated successfully'));
    } catch (error: any) {
      next(error);
    }
  }
}

export default new StocksController();

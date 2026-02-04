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
      const { start_date, end_date } = req.query;

      if (!user || !user.companyId) {
        throw new AppError('Authentication required or user not associated with a company.', 401);
      }

      const projection = await this.stocksService.getStockProjection({
        companyId: user.companyId,
        startDate: new Date(start_date as string),
        endDate: new Date(end_date as string),
      });

      return res.status(200).json(ApiResponse.success(projection));
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
      const { variantId, inStock } = req.body;
      const user = (req as any).user;

      if (!user || !user.companyId) {
        throw new AppError('Authentication required or user not associated with a company.', 401);
      }

      const upsertedStock = await this.stocksService.updateStock({
        user: { companyId: user.companyId }, // Pass only companyId as locationId is no longer needed
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

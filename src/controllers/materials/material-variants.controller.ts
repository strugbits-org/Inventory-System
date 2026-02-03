import { Request, Response, NextFunction } from 'express';
import materialVariantServiceInstance, { MaterialVariantService } from '../../services/materials/material-variants.service.js';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';
import fs from 'fs';
import csv from 'csv-parser';

class MaterialVariantController {
  private materialVariantService: MaterialVariantService;

  constructor(materialVariantService: MaterialVariantService = materialVariantServiceInstance) {
    this.materialVariantService = materialVariantService;
  }
  
  /**
   * Get all variants for a material
   */
  getVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { materialId } = req.params;
      const { includeInactive } = req.query;
      const user = (req as any).user;

      const variants = await this.materialVariantService.getMaterialVariants(
        materialId as string,
        includeInactive === 'true',
        user
      );

      return res.status(200).json(ApiResponse.success(variants));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all variants
   */
  getAllVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isActive, type, page, limit } = req.query;
      const search = req.query.search || req.query.q || req.query.query;

      const status = isActive === 'true' ? 'active' : 'inactive';

      const result = await this.materialVariantService.getAllMaterialVariants({
        includeInactive: isActive === 'true',
        status: status as string | undefined,
        search: search as string | undefined,
        types: type as string[] | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10
      }, (req as any).user);

      return res.status(200).json(ApiResponse.paginated(result.variants, result.meta));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single variant by ID
   */
  getVariantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const variant = await this.materialVariantService.getVariantById(id as string, user);

      if (!variant) {
        throw new AppError('Material variant not found', 404);
      }

      return res.status(200).json(ApiResponse.success(variant));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new variant
   */
  createVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { materialId: paramMaterialId } = req.params;
      const { materialId: bodyMaterialId } = req.body;
      const user = (req as any).user;

      const materialId = paramMaterialId || bodyMaterialId;

      if (!materialId) {
        throw new AppError('Material ID is required', 400);
      }

      const variant = await this.materialVariantService.createVariant({
        materialId,
        ...req.body,
      }, user);

      return res.status(201).json(ApiResponse.success(variant, 'Material variant created successfully', 201));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a variant
   */
  updateVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const variant = await this.materialVariantService.updateVariant(id as string, req.body, user);

      return res.status(200).json(ApiResponse.success(variant, 'Material variant updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Soft delete a variant
   */
  deleteVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.materialVariantService.deleteVariant(id as string);

      return res.status(200).json(ApiResponse.success(null, 'Material variant deactivated'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update stock for a variant
   */
  updateStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { inStock, locationId } = req.body;
      const user = (req as any).user;

      if (!user || !user.companyId) {
        throw new AppError('Authentication required', 401);
      }

      // Use provided locationId or fall back to user's location
      const targetLocationId = locationId || user.locationId;

      if (!targetLocationId) {
        throw new AppError('Location ID is required to update stock', 400);
      }

      const updatedStock = await this.materialVariantService.updateStock(
        id as string,
        user.companyId,
        targetLocationId,
        inStock,
        user
      );

      return res.status(200).json(ApiResponse.success(updatedStock, 'Stock updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get stock for a variant
   */
  getStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { locationId } = req.query;
      const user = (req as any).user;

      if (!user || !user.companyId) {
        throw new AppError('Authentication required', 401);
      }

      // Use provided locationId or fall back to user's location
      const targetLocationId = (locationId as string) || user.locationId;

      if (!targetLocationId) {
        throw new AppError('Location ID is required to get stock', 400);
      }

      const stock = await this.materialVariantService.getStock(
        id as string,
        user.companyId,
        targetLocationId
      );

      return res.status(200).json(ApiResponse.success(stock || { inStock: 0 }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get usage forecast
   */
  getUsageForecast = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, locationId } = req.query;
      const user = (req as any).user;

      if (!user || !user.companyId) {
        throw new AppError('Authentication required', 401);
      }

      // Use provided locationId or fall back to user's location
      const targetLocationId = (locationId as string) || user.locationId;

      if (!targetLocationId) {
        throw new AppError('Location ID is required', 400);
      }

      const forecast = await this.materialVariantService.getUsageForecast(
        user.companyId,
        targetLocationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      return res.status(200).json(ApiResponse.success(forecast));
    } catch (error) {
      next(error);
    }
  };

    /**
   * Import variants from CSV
   */
  importVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('CSV file is required', 400);
      }

      const mode = (req.query.mode as 'create' | 'upsert') || 'create';
      const results: any[] = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          // Remove temp file
          fs.unlinkSync(req.file!.path);

          try {
            const importResult = await this.materialVariantService.importFromCsv(results, mode);
            return res.status(200).json(ApiResponse.success(importResult, 'CSV import processed successfully'));
          } catch (error) {
             next(error);
          }
        })
        .on('error', (error) => {
            // Remove temp file on error too
            if(req.file) fs.unlinkSync(req.file.path);
            next(new AppError('Failed to parse CSV file', 400));
        });

    } catch (error) {
      next(error);
    }
  };
}

export default new MaterialVariantController();


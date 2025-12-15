import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import materialVariantService from '../../services/materials/material-variants.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import fs from 'fs';
import csv from 'csv-parser';

class MaterialVariantController {
  
  /**
   * Get all variants for a material
   */
  getVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { materialId } = req.params;
      const { includeInactive } = req.query;

      const variants = await materialVariantService.getMaterialVariants(
        materialId,
        includeInactive === 'true'
      );

      res.status(200).json({
        success: true,
        data: variants,
      });
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
      const variant = await materialVariantService.getVariantById(id);

      if (!variant) {
        throw new AppError('Material variant not found', 404);
      }

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new variant
   */
  createVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { materialId } = req.params;

      const schema = Joi.object({
        name: Joi.string().required(),
        color: Joi.string().optional().allow(null, ''),
        type: Joi.string().optional().allow(null, ''),
        pricePerGallon: Joi.number().min(0).required(),
        coverageArea: Joi.number().min(0).required(),
        overageRate: Joi.number().min(0).required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new AppError(`Validation error: ${error.details[0].message}`, 400);
      }

      const variant = await materialVariantService.createVariant({
        materialId,
        ...value,
      });

      res.status(201).json({
        success: true,
        data: variant,
      });
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

      const schema = Joi.object({
        name: Joi.string().optional(),
        color: Joi.string().optional().allow(null, ''),
        type: Joi.string().optional().allow(null, ''),
        pricePerGallon: Joi.number().min(0).optional(),
        coverageArea: Joi.number().min(0).optional(),
        overageRate: Joi.number().min(0).optional(),
        isActive: Joi.boolean().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new AppError(`Validation error: ${error.details[0].message}`, 400);
      }

      // If body is empty
      if (Object.keys(value).length === 0) {
        throw new AppError('No data provided for update', 400);
      }

      const variant = await materialVariantService.updateVariant(id, value);

      res.status(200).json({
        success: true,
        data: variant,
      });
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
      await materialVariantService.deleteVariant(id);

      res.status(200).json({
        success: true,
        message: 'Material variant deactivated',
      });
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
            const importResult = await materialVariantService.importFromCsv(results, mode);
            res.status(200).json(importResult);
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

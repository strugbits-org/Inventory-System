import { prisma } from '../../db/db.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { UserRole } from '@prisma/client';

interface GetStockProjectionParams {
  companyId: string;
  startDate: Date;
  endDate: Date;
}

interface UpdateStockParams {
  user: {
    companyId: string;
    locationId: string;
  };
  variantId: number;
  inStock: number;
}

export class StocksService {

  /**
   * Get stock projection for a date range
   */
  async getStockProjection({ companyId, startDate, endDate }: GetStockProjectionParams) {
    // 1. Find all jobs in the date range for the company
    const jobs = await prisma.job.findMany({
      where: {
        companyId,
        installDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        jobMaterials: {
          include: {
            variant: {
              include: {
                material: true, // Include the associated Material
              },
            },
          },
        },
      },
    });

    if (!jobs.length) {
      return [];
    }

    // 2. Aggregate required quantities for each variant
    const requiredQuantities = new Map<string, { variant: any; required: number }>();
    for (const job of jobs) {
      for (const material of job.jobMaterials) {
        const existing = requiredQuantities.get(material.variantId) || { variant: material.variant, required: 0 };
        existing.required += Number(material.quantityUsed);
        requiredQuantities.set(material.variantId, existing);
      }
    }

    // 3. Get all stock for the company
    const companyStock = await prisma.stock.findMany({
      where: { companyId },
    });
    
    // 4. Aggregate stock quantities for each variant across all locations
    const stockQuantities = new Map<string, number>();
    for (const stockItem of companyStock) {
        const existingStock = stockQuantities.get(stockItem.variantId) || 0;
        stockQuantities.set(stockItem.variantId, existingStock + Number(stockItem.inStock));
    }


    // 5. Combine and calculate needed quantities
    const projection = Array.from(requiredQuantities.values()).map(({ variant, required }) => {
      const inStock = stockQuantities.get(variant.id) || 0;
      const needed = Math.max(0, required - inStock);
      return {
        'color': variant.color,
        'name': variant.name,
        'productType': variant.material.type,
        'inStock': inStock,
        'useQty': required,
        'toOrder': needed,
        variantId: variant.variantId, // Keeping variantId for potential internal use
        variantName: variant.name, // Keeping variantName for context
        materialName: variant.material.name, // Adding material name for context
      };
    });

    return projection;
  }

  /**
   * Update stock quantity
   */
  async updateStock({ user, variantId, inStock }: UpdateStockParams) {
    const { companyId, locationId } = user;

    // 1. Find the material variant by its integer ID to get the UUID primary key
    const materialVariant = await prisma.materialVariant.findUnique({
      where: {
        variantId: variantId,
      },
    });

    if (!materialVariant) {
      throw new AppError(`Variant with ID ${variantId} not found`, 404);
    }

    // 2. Use the UUID (materialVariant.id) for the upsert operation on the Stock table
    const upsertedStock = await prisma.stock.upsert({
      where: {
        companyId_locationId_variantId: {
          companyId,
          locationId,
          variantId: materialVariant.id, // Use the string UUID from the looked-up variant
        },
      },
      update: {
        inStock,
      },
      create: {
        companyId,
        locationId,
        variantId: materialVariant.id, // Use the string UUID for the foreign key
        inStock,
      },
    });

    return upsertedStock;
  }
}

export default new StocksService();

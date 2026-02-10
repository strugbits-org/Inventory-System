import { prisma } from '../../db/db.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { UserRole } from '@prisma/client';

interface GetStockProjectionParams {
  companyId: string;
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
}

interface UpdateStockParams {
  user: {
    companyId: string;
  };
  variantId: number;
  inStock: number;
}

export class StocksService {

  /**
   * Get stock projection for a date range
   */
  async getStockProjection({ companyId, startDate, endDate, page = 1, limit = 10 }: GetStockProjectionParams) {
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
      return {
        data: [],
        meta: {
          currentPage: page,
          limit,
          totalRecords: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
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

    // 3. Get all CompanyQuantityOverride for the company (to use as "inStock" for projection)
    const companyQuantityOverrides = await prisma.companyQuantityOverride.findMany({
      where: { companyId },
    });

    // 4. Populate stockQuantities map from CompanyQuantityOverride
    const stockQuantities = new Map<string, number>();
    for (const overrideItem of companyQuantityOverrides) {
      const existingStock = stockQuantities.get(overrideItem.variantId) || 0;
      stockQuantities.set(overrideItem.variantId, existingStock + Number(overrideItem.quantity)); // Use override.quantity as inStock
    }

    // 5. Combine and calculate needed quantities
    const allProjections = Array.from(requiredQuantities.values()).map(({ variant, required }) => {
      // Use the quantity from CompanyQuantityOverride as the "inStock" for projection
      const inStock = stockQuantities.get(variant.id) || 0;
      const needed = Math.max(0, required - inStock);
      return {
        'color': variant.color,
        'name': variant.name,
        'productType': variant.material.type,
        'inStock': inStock, // This now reflects CompanyQuantityOverride.quantity
        'useQty': required,
        'toOrder': needed,
        variantId: variant.variantId,
        variantName: variant.name,
        materialName: variant.material.name,
      };
    });

    // 6. Apply Pagination
    const totalRecords = allProjections.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedData = allProjections.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      meta: {
        currentPage: page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Update stock quantity
   */
  async updateStock({ user, variantId, inStock }: UpdateStockParams) {
    const { companyId } = user; // Removed locationId as it's not used in CompanyQuantityOverride

    // 1. Find the material variant by its integer ID to get the UUID primary key
    const materialVariant = await prisma.materialVariant.findUnique({
      where: {
        variantId: variantId,
      },
    });

    if (!materialVariant) {
      throw new AppError(`Variant with ID ${variantId} not found`, 404);
    }

    // 2. Use the UUID (materialVariant.id) for the upsert operation on the CompanyQuantityOverride table
    const upsertedOverride = await prisma.companyQuantityOverride.upsert({
      where: {
        companyId_variantId: { // Unique constraint is companyId and variantId (UUID)
          companyId,
          variantId: materialVariant.id, // Use the string UUID from the looked-up variant
        },
      },
      update: {
        quantity: inStock, // Update the 'quantity' field
      },
      create: {
        companyId,
        variantId: materialVariant.id, // Use the string UUID for the foreign key
        quantity: inStock, // Create with the 'quantity' field
      },
    });

    return upsertedOverride;
  }
}

export default new StocksService();

import { Prisma, UserRole } from '@prisma/client';
import { JwtPayload } from '../../middleware/jwtAuth.js';
import db from '../../db/db.service.js';
import { paginate } from '../../utils/pagination.js';

interface CreateMaterialVariantInput {
  materialId: string;
  name: string;
  color?: string;
  type?: string;
  regularPrice: number;
  preferredPrice: number;
  coverageArea: number;
  overageRate: number;
}

interface UpdateMaterialVariantInput {
  materialId?: string;
  name?: string;
  color?: string;
  type?: string;
  regularPrice?: number;
  preferredPrice?: number;
  coverageArea?: number;
  overageRate?: number;
  isActive?: boolean;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

interface CsvRow {
  materialType: string;
  name: string;
  color?: string;
  type?: string;
  regularPrice: string;
  preferredPrice: string;
  coverageArea: string;
  overageRate: string;
}

export class MaterialVariantService {
  /**
   * Get all variants for a material
   */
  async getMaterialVariants(materialId: string, includeInactive = false, user: JwtPayload) {
    const where: Prisma.MaterialVariantWhereInput = {
      materialId,
      ...(!includeInactive && { isActive: true }),
    };

    const variants = await db.prisma.materialVariant.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        material: true, // Ensure material is included for the helper
      },
    });

    const variantsWithOverage = await this._applyOverageRates(variants, user);
    return this._applyQuantityOverrides(variantsWithOverage, user);
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(id: string, user: JwtPayload) {
    const variant = await db.prisma.materialVariant.findUnique({
      where: { id },
      include: {
        material: true,
      },
    });

    if (!variant) {
      return null;
    }

    // Apply override logic by calling the helper with a single-item array
    const [variantWithCorrectOverage] = await this._applyOverageRates([variant], user);
    const [variantWithCorrectQuantity] = await this._applyQuantityOverrides([variantWithCorrectOverage], user);

    return variantWithCorrectQuantity;
  }

  private async _applyQuantityOverrides(
    variants: any[],
    user: JwtPayload,
  ) {
    const isCompanyUser = user.role === UserRole.COMPANY || user.role === UserRole.EMPLOYEE;
    if (!isCompanyUser || !user.companyId) {
      return variants; // Return original variants if not a company user
    }

    const overrides = await db.prisma.companyQuantityOverride.findMany({
      where: {
        companyId: user.companyId,
        variantId: { in: variants.map(v => v.id) }
      },
      select: { variantId: true, quantity: true }
    });

    if (overrides.length === 0) {
        return variants; // No overrides for this set of variants, return original
    }
    
    const quantityMap = new Map(overrides.map(o => [o.variantId, o.quantity]));

    return variants.map(variant => {
        const overrideQuantity = quantityMap.get(variant.id);
        // Create a new object to avoid modifying the original object from cache
        return overrideQuantity !== undefined
            ? { ...variant, companyQuantity: overrideQuantity }
            : variant;
    });
  }

  private async _applyOverageRates(
    variants: (Prisma.MaterialVariantGetPayload<{ include: { material: true } }>)[],
    user: JwtPayload,
  ) {
    const isCompanyUser = user.role === UserRole.COMPANY || user.role === UserRole.EMPLOYEE;
    if (!isCompanyUser || !user.companyId) {
      // For Superadmin or unauthenticated, simply return variants with their regularPrice as effectivePrice
      return variants.map(variant => ({
          ...variant,
          effectivePrice: variant.regularPrice, // Default to regular price
      }));
    }

    const company = await db.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { preferredPriceEnabled: true },
    });

    const usePreferredPrice = company?.preferredPriceEnabled === true;

    const overrides = await db.prisma.companyOverageOverride.findMany({
      where: {
        companyId: user.companyId,
        variantId: { in: variants.map(v => v.id) }
      },
      select: { variantId: true, overageRate: true }
    });

    if (overrides.length === 0 && !usePreferredPrice) {
        return variants.map(variant => ({
            ...variant,
            effectivePrice: variant.regularPrice, // Default to regular price
        }));
    }
    
    const overageMap = new Map(overrides.map(o => [o.variantId, o.overageRate]));

    return variants.map(variant => {
        const overrideRate = overageMap.get(variant.id);
        const effectivePrice = usePreferredPrice ? variant.preferredPrice : variant.regularPrice;

        return {
            ...variant,
            effectivePrice: effectivePrice,
            companyOverageRate: overrideRate !== undefined ? overrideRate : undefined
        };
    });
  }

  /**
   * Get all material variants
   */
  async getAllMaterialVariants(
    params: {
      page?: number,
      limit?: number;
      includeInactive?: boolean;
      status?: string;
      search?: string;
      types?: string | string[];
    },
    user: JwtPayload,
  ) {
    const {
      limit = 10,
      includeInactive = false,
      status,
      search,
      types,
      page = 1
    } = params;

    const where: Prisma.MaterialVariantWhereInput = {};

    // Filter Logic
    if (user.role !== UserRole.SUPERADMIN) {
        // Enforce active only for non-superadmins
        where.isActive = true;
    } else {
        // Superadmin logic
        if (status === 'active') {
            where.isActive = true;
        } else if (status === 'inactive') {
            where.isActive = false;
        } else if (!includeInactive) {
            // Default behavior if no status and no includeInactive: distinct active only? 
            // Or usually we default to active unless asked otherwise.
            where.isActive = true;
        }
        // If includeInactive is true, we don't set isActive filter, returning all.
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (types && types.length > 0) {
        const typeArray = Array.isArray(types) ? types : [types];
        if (typeArray.length > 0) {
            where.material = {
                name: {
                    in: typeArray,
                    mode: 'insensitive'
                }
            }
        }
    }

    // 1. Get paginated variants using the utility
    const { data: variantsWithMaterial, meta: paginationMeta } = await paginate(db.prisma.materialVariant, {
        page,
        limit,
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
            material: true,
        },
    });
    
    // 2. Apply overage rate logic and effective pricing using the helper
    const variantsWithCorrectOverageAndPricing = await this._applyOverageRates(variantsWithMaterial, user);
    const variantsWithCorrectQuantity = await this._applyQuantityOverrides(variantsWithCorrectOverageAndPricing, user);

    // 3. Format the final output
    const formattedVariants = variantsWithCorrectQuantity.map((variant: any) => ({
        'product type': variant.material.name,
        name: variant.name,
        color: variant.color,
        regularPrice: Number(variant.regularPrice), // New field
        preferredPrice: Number(variant.preferredPrice), // New field
        effectivePrice: Number(variant.effectivePrice), // New field
        coverageArea: Number(variant.coverageArea),
        overageRate: Number(variant.overageRate),
        quantity: Number(variant.quantity),
        companyOverageRate: variant.companyOverageRate !== undefined ? Number(variant.companyOverageRate) : undefined,
        companyQuantity: variant.companyQuantity !== undefined ? Number(variant.companyQuantity) : undefined,
        id: variant.id,
        variantId: variant.variantId,
        isActive: variant.isActive
    }));

    return {
      variants: formattedVariants,
      meta: paginationMeta,
    };
  }

  /**
   * Create a new material variant
   */
  async createVariant(data: CreateMaterialVariantInput, user: JwtPayload) {
    const newVariant = await db.prisma.materialVariant.create({
      data: {
        materialId: data.materialId,
        name: data.name,
        color: data.color,
        type: data.type,
        regularPrice: data.regularPrice,
        preferredPrice: data.preferredPrice,
        coverageArea: data.coverageArea,
        overageRate: data.overageRate,
      },
      include: {
        material: true,
      }
    });

    const [variantWithCorrectOverage] = await this._applyOverageRates([newVariant], user);
    const [variantWithCorrectQuantity] = await this._applyQuantityOverrides([variantWithCorrectOverage], user);
    return variantWithCorrectQuantity;
  }

  /**
   * Update a material variant
   */
  async updateVariant(id: string, data: UpdateMaterialVariantInput, user: JwtPayload) {
    // Check existence using the refactored getVariantById to respect user context
    const variant = await this.getVariantById(id, user);
    if (!variant) {
      throw new Error('Material variant not found');
    }

    const updatedVariant = await db.prisma.materialVariant.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        type: data.type,
        regularPrice: data.regularPrice,
        preferredPrice: data.preferredPrice,
        coverageArea: data.coverageArea,
        overageRate: data.overageRate,
        isActive: data.isActive,
      },
      include: {
        material: true
      }
    });

    const [variantWithCorrectOverage] = await this._applyOverageRates([updatedVariant], user);
    const [variantWithCorrectQuantity] = await this._applyQuantityOverrides([variantWithCorrectOverage], user);
    return variantWithCorrectQuantity;
  }

  /**
   * Soft delete a material variant
   */
  async deleteVariant(id: string) {
    return db.prisma.materialVariant.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Update stock for a material variant in a specific location
   */
  async updateStock(
    variantId: string,
    companyId: string,
    locationId: string,
    quantity: number,
    user: JwtPayload
  ) {
    // Verify variant exists
    const variant = await this.getVariantById(variantId, user);
    if (!variant) {
      throw new Error('Material variant not found');
    }

    // Upsert stock record
    return db.prisma.stock.upsert({
      where: {
        companyId_locationId_variantId: {
          companyId,
          locationId,
          variantId,
        },
      },
      update: {
        inStock: quantity,
      },
      create: {
        companyId,
        locationId,
        variantId,
        inStock: quantity,
      },
      include: {
        variant: true,
      }
    });
  }

  /**
   * Get stock for a material variant in a specific location
   */
  async getStock(
      variantId: string,
      companyId: string,
      locationId: string
  ) {
    const stock = await db.prisma.stock.findUnique({
      where: {
        companyId_locationId_variantId: {
          companyId,
          locationId,
          variantId,
        },
      },
      select: {
          inStock: true,
      }
    });

    return stock;
  }

  /**
   * Get forecast of material usage in a time range
   */
  async getUsageForecast(
    companyId: string,
    locationId: string,
    startDate: Date,
    endDate: Date
  ) {
    // 1. Find jobs in the time range
    const jobs = await db.prisma.job.findMany({
      where: {
        companyId,
        locationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['PENDING', 'ORDERED'] // Only look at active/future jobs? Or all jobs? "going to use" implies future.
        }
      },
      include: {
        jobMaterials: true
      }
    });

    // 2. Aggregate usage by variantId
    const usageMap = new Map<string, number>();

    for (const job of jobs) {
      for (const jm of job.jobMaterials) {
         const current = usageMap.get(jm.variantId) || 0;
         usageMap.set(jm.variantId, current + Number(jm.quantityUsed));
      }
    }

    // 3. Get all variants that have usage OR have stock
    // Actually, user said "fetch all the variants which are going to use... with their inStock quantity"
    // So we primarily care about variants with >0 usage.
    
    const variantIds = Array.from(usageMap.keys());
    
    // Fetch variants and their stocks
    const variants = await db.prisma.materialVariant.findMany({
      where: {
        id: { in: variantIds }
      },
      include: {
        stock: {
          where: {
            companyId,
            locationId
          },
          select: {
            inStock: true
          }
        },
        material: {
            select: {
                name: true,
                unit: true
            }
        }
      }
    });

    // Format result
    return variants.map(v => ({
      id: v.id,
      name: v.name,
      materialName: v.material.name,
      unit: v.material.unit,
      plannedUsage: usageMap.get(v.id) || 0,
      inStock: v.stock[0]?.inStock || 0
    }));
  }

  /**
   * Process CSV import
   */
  async importFromCsv(rows: CsvRow[], mode: 'create' | 'upsert' = 'create'): Promise<{ summary: ImportResult; errors: any[] }> {
    const summary: ImportResult = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };
    const errors: any[] = [];

    // Pre-fetch material types map
    const materials = await db.findAll<{ id: string; type: string }>('material', { id: true, type: true });
    const materialTypeMap = new Map(materials.map(m => [m.type.toLowerCase(), m.id]));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
      try {
        const rowNum = i + 2; // +1 for header, +1 for 0-index

        // Validate required fields
        if (!row.materialType || !row.name || !row.regularPrice || !row.preferredPrice || !row.coverageArea || !row.overageRate) {
          errors.push({ row: rowNum, reason: 'Missing required fields' });
          summary.failed++;
          continue;
        }

        const materialId = materialTypeMap.get(row.materialType.toLowerCase());
        if (!materialId) {
          errors.push({ row: rowNum, reason: `Invalid materialType: ${row.materialType}` });
          summary.failed++;
          continue;
        }

        const regularPrice = parseFloat(row.regularPrice);
        const preferredPrice = parseFloat(row.preferredPrice);
        const coverageArea = parseFloat(row.coverageArea);
        const overageRate = parseFloat(row.overageRate);

        if (isNaN(regularPrice) || isNaN(preferredPrice) || isNaN(coverageArea) || isNaN(overageRate)) {
          errors.push({ row: rowNum, reason: 'Invalid numeric values' });
          summary.failed++;
          continue;
        }

        const variantData = {
          materialId,
          name: row.name,
          color: row.color || null,
          type: row.type || null,
          regularPrice,
          preferredPrice,
          coverageArea,
          overageRate,
        };

        const existing = await db.prisma.materialVariant.findFirst({
        where: {
            materialId,
            name: {
                equals: row.name,
                mode: 'insensitive'
            }
        }
        });

        if (existing) {
          if (mode === 'upsert') {
            await db.prisma.materialVariant.update({
              where: { id: existing.id },
              data: {
                  color: variantData.color,
                  type: variantData.type,
                  regularPrice: variantData.regularPrice,
                  preferredPrice: variantData.preferredPrice,
                  coverageArea: variantData.coverageArea,
                  overageRate: variantData.overageRate,
                  // Don't update name or materialId as they are the composite key
              },
            });
            summary.updated++;
          } else {
            summary.skipped++;
          }
        } else {
          await db.prisma.materialVariant.create({
            data: variantData,
          });
          summary.created++;
        }

      } catch (error: any) {
        errors.push({ row: i + 2, reason: error.message || 'Unknown error' });
        summary.failed++;
      }
    }

    return { summary, errors };
  }
}

export default new MaterialVariantService();

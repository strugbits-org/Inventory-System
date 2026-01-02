import { Prisma } from '@prisma/client';
import db from '../../db/db.service.js';

interface CreateMaterialVariantInput {
  materialId: string;
  name: string;
  color?: string;
  type?: string;
  pricePerGallon: number;
  coverageArea: number;
  overageRate: number;
}

interface UpdateMaterialVariantInput {
  name?: string;
  color?: string;
  type?: string;
  pricePerGallon?: number;
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
  pricePerGallon: string;
  coverageArea: string;
  overageRate: string;
}

export class MaterialVariantService {
  /**
   * Get all variants for a material
   */
  async getMaterialVariants(materialId: string, includeInactive = false) {
    const where: Prisma.MaterialVariantWhereInput = {
      materialId,
      ...(!includeInactive && { isActive: true }),
    };

    return db.prisma.materialVariant.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(id: string) {
    return db.prisma.materialVariant.findUnique({
      where: { id },
      include: {
        material: true,
      },
    });
  }

  /**
   * Get all material variants
   */
  async getAllMaterialVariants(params: {
    page?: number;
    limit?: number;
    includeInactive?: boolean;
    search?: string;
    types?: string | string[];
  }) {
    const {
      page = 1,
      limit = 10,
      includeInactive = false,
      search,
      types
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MaterialVariantWhereInput = {};

    if (!includeInactive) {
      where.isActive = true;
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

    const [total, variants] = await db.prisma.$transaction([
      db.prisma.materialVariant.count({ where }),
      db.prisma.materialVariant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          material: true,
        },
      }),
    ]);

    return {
      variants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new material variant
   */
  async createVariant(data: CreateMaterialVariantInput) {
    // Check for uniqueness
    const existing = await db.prisma.materialVariant.findFirst({
      where: {
        materialId: data.materialId,
        name: {
          equals: data.name,
          mode: 'insensitive', // Case insensitive check
        },
      },
    });

    if (existing) {
      throw new Error(`Variant with name "${data.name}" already exists for this material`);
    }

    return db.prisma.materialVariant.create({
      data: {
        ...data,
      },
    });
  }

  /**
   * Update a material variant
   */
  async updateVariant(id: string, data: UpdateMaterialVariantInput) {
    // Check existence
    const variant = await this.getVariantById(id);
    if (!variant) {
      throw new Error('Material variant not found');
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name.toLowerCase() !== variant.name.toLowerCase()) {
      const existing = await db.prisma.materialVariant.findFirst({
        where: {
          materialId: variant.materialId,
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (existing) {
        throw new Error(`Variant with name "${data.name}" already exists for this material`);
      }
    }

    return db.prisma.materialVariant.update({
      where: { id },
      data,
    });
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
    quantity: number
  ) {
    // Verify variant exists
    const variant = await this.getVariantById(variantId);
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
          in: ['PENDING', 'IN_PROGRESS'] // Only look at active/future jobs? Or all jobs? "going to use" implies future.
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
        if (!row.materialType || !row.name || !row.pricePerGallon || !row.coverageArea || !row.overageRate) {
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

        const pricePerGallon = parseFloat(row.pricePerGallon);
        const coverageArea = parseFloat(row.coverageArea);
        const overageRate = parseFloat(row.overageRate);

        if (isNaN(pricePerGallon) || isNaN(coverageArea) || isNaN(overageRate)) {
          errors.push({ row: rowNum, reason: 'Invalid numeric values' });
          summary.failed++;
          continue;
        }

        const variantData = {
          materialId,
          name: row.name,
          color: row.color || null,
          type: row.type || null,
          pricePerGallon,
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
                  pricePerGallon: variantData.pricePerGallon,
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

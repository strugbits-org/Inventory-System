import { Prisma, JobStatus, UserRole } from '@prisma/client';
import { prisma } from '../../db/db.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { paginate } from '../../utils/pagination.js';
import { jobTemplates } from '../../config/job.config.js';

interface CreateJobMaterial {
  variantId: string;
  quantityUsed: number;
  cost: number;
  additionalQty: number;
  additionalCost: number;
}

interface CreateJobData {
  jobId: string;
  clientFirstName: string;
  clientLastName?: string;
  clientAddress: string;
  areaSqFt: number;
  duration: number;
  date: string | Date; // ISO string or Date
  installDate: string | Date;
  jobTemplateName?: string; // e.g., 'standard'
  jobCost?: number;
  companyId?: string; // Optional if inferred from user
  jobMaterials: CreateJobMaterial[];
}

interface UpdateJobData {
  jobId?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientAddress?: string;
  areaSqFt?: number;
  duration?: number;
  date?: string | Date;
  installDate?: string | Date;
  jobCost?: number;
  jobMaterials?: {
    variantId: number | string; // Integer ID
    quantityUsed: number;
    cost: number;
    additionalQty?: number;
    additionalCost?: number;
  }[];
}

export class JobsService {

  /**
   * Create a new job
   * Restriction: Now handled by middleware (Company Admin or Production Manager)
   */
  async createJob(data: CreateJobData, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const isSuperAdmin = user.role === UserRole.SUPERADMIN;
    // For job creation, we either need the user's companyId or one provided in the data (for superadmins)
    const companyId = isSuperAdmin ? (data.companyId || user.companyId) : user.companyId;
    const locationId = user.locationId; // Location might still be required for creation context

    if (!companyId) {
        throw new AppError('Company ID is required for job creation.', 400);
    }
    if (!locationId) {
        throw new AppError('User is not associated with a location.', 400);
    }

    // Fetch company's preferredPriceEnabled setting
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { preferredPriceEnabled: true },
    });

    const usePreferredPrice = company?.preferredPriceEnabled === true;

    // Check for duplicate jobId within the same company
    const existingJob = await prisma.job.findFirst({
        where: { jobId: data.jobId, companyId: companyId },
    });

    if (existingJob) {
        throw new AppError(`Job ID '${data.jobId}' already exists for this company.`, 409);
    }

    // 1. Validate Material Variants and their types
    const variantIntIds = data.jobMaterials.map(jm => Number(jm.variantId));
    const materialVariants = await prisma.materialVariant.findMany({
      where: {
        variantId: { in: variantIntIds },
      },
      select: {
        id: true,
        variantId: true,
        type: true,
        materialId: true,
        regularPrice: true, // Include regularPrice
        preferredPrice: true, // Include preferredPrice
        material: {
          select: {
            unit: true,
          },
        },
      },
    });

    if (materialVariants.length !== variantIntIds.length) {
      throw new AppError('One or more material variants not found.', 404);
    }

    // 2. Validate against Job Template if provided
    if (data.jobTemplateName) {
        const template = jobTemplates[data.jobTemplateName];
        if (!template) {
            throw new AppError(`Job template '${data.jobTemplateName}' not found.`, 404);
        }

        const materialTypesInJob = new Map<string, number>();
        for (const variant of materialVariants) {
            if (variant.type) {
                materialTypesInJob.set(variant.type, (materialTypesInJob.get(variant.type) || 0) + 1);
            }
        }

        for (const req of template.requirements) {
            const countInJob = materialTypesInJob.get(req.materialType) || 0;
            if (countInJob !== req.requiredCount) {
                throw new AppError(`Job validation failed for template '${data.jobTemplateName}': Expected ${req.requiredCount} of material type '${req.materialType}', but found ${countInJob}.`, 400);
            }
        }
    }

    const variantIntIdToMaterialDetailsMap = new Map<number, typeof materialVariants[0]>();
    materialVariants.forEach(mv => variantIntIdToMaterialDetailsMap.set(mv.variantId, mv));

    // 3. Create Job and JobMaterials in a transaction
    return prisma.$transaction(async (prisma) => {
      const job = await prisma.job.create({
        data: {
          jobId: data.jobId,
          companyId: companyId,
          locationId: locationId,
          createdByUserId: user.id || user.userId,
          clientFirstName: data.clientFirstName,
          clientLastName: data.clientLastName,
          clientAddress: data.clientAddress,
          areaSqFt: data.areaSqFt,
          duration: data.duration,
          date: new Date(data.date),
          installDate: new Date(data.installDate),
          jobCost: data.jobCost || 0,
          status: JobStatus.PENDING,
        },
      });

      const jobMaterialsToCreate = data.jobMaterials.map(jm => {
        const variantDetails = variantIntIdToMaterialDetailsMap.get(Number(jm.variantId));
        if (!variantDetails) throw new AppError('Variant details not found', 500);

        const costAtTime = usePreferredPrice ? variantDetails.preferredPrice : variantDetails.regularPrice;

        return {
          jobId: job.id,
          materialId: variantDetails.materialId,
          variantId: variantDetails.id, // Use UUID from lookup
          quantityUsed: jm.quantityUsed,
          costAtTime: costAtTime, // Use the dynamically determined price
          additionalQty: jm.additionalQty,
          additionalCost: jm.additionalCost,
          unit: variantDetails.material.unit,
        };
      });

      await prisma.jobMaterial.createMany({
        data: jobMaterialsToCreate,
      });

      return job;
    });
  }

  /**
   * Get a job by ID
   * Restriction: Superadmin (all), Company/Employee (own company only)
   */
  async getJob(id: string, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: { select: { name: true } },
        location: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        jobMaterials: {
          include: {
            variant: {
              select: {
                name: true,
                variantId: true, // The integer ID
                color: true,
              }
            }
          }
        }
      }
    });

    if (!job) return null;

    // Object-level security check
    if (user.role !== UserRole.SUPERADMIN && job.companyId !== user.companyId) {
      throw new AppError('Access denied: Job belongs to another company.', 403);
    }

    // If jobMaterials exist, transform the array to an object keyed by materialId
    if (job.jobMaterials) {
      (job as any).jobMaterials = job.jobMaterials.reduce((acc: any, material: any) => {
        if (material.materialId) { // Use materialId for the key
            acc[material.materialId] = material;
          }
        return acc;
      }, {});
    }

    return job;
  }

  /**
   * List jobs
   * Restriction: Superadmin (all), Company/Employee (own company only)
   */
  async listJobs(params: { page?: number; limit?: number; companyId?: string; status?: JobStatus; search?: string, detailed?: boolean }, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const page = params.page || 1;
    const limit = params.limit || 10;

    const where: Prisma.JobWhereInput = {};

    // Filter by Company
    if (user.role === UserRole.SUPERADMIN) {
      if (params.companyId) {
        where.companyId = params.companyId;
      }
    } else {
      // Force user's company
      where.companyId = user.companyId;
    }

    // Filter by Status
    if (params.status) {
      where.status = params.status;
    } else {
      // By default, do not show archived jobs unless explicitly requested
      where.status = { not: JobStatus.ARCHIVED };
    }

    // Search Logic
    if (params.search) {
      where.OR = [
        { jobId: { contains: params.search, mode: 'insensitive' } },
        { clientFirstName: { contains: params.search, mode: 'insensitive' } },
        { clientLastName: { contains: params.search, mode: 'insensitive' } },
        { clientAddress: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    
    const includeClause = params.detailed ? {
        company: { select: { name: true } },
        location: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        jobMaterials: {
          include: {
            variant: {
              select: {
                name: true,
                variantId: true,
                color: true,
              }
            }
          }
        }
    } : {
        location: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } }
    };

    const result = await paginate(prisma.job, {
        page,
        limit,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: includeClause
      });

    // Transform jobMaterials array to object for each job
    const transformedJobs = result.data.map((job: any) => {
      if (job.jobMaterials) {
        (job as any).jobMaterials = job.jobMaterials.reduce((acc: any, material: any) => {
          if (material.materialId) { // Use materialId for the key
            acc[material.materialId] = material;
          }
          return acc;
        }, {});
      }
      return job;
    });


    return {
      jobs: transformedJobs,
      meta: result.meta
    };
  }

  /**
   * Update Job Details
   * Restriction: Now handled by middleware (Company Admin or Production Manager)
   */
  async updateJob(id: string, data: UpdateJobData, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    return prisma.$transaction(async (tx) => {
        // 1. Fetch job to verify ownership
        const job = await tx.job.findUnique({ where: { id } });

        if (!job) {
            throw new AppError('Job not found', 404);
        }
        // Object-level security check
        if (user.role !== UserRole.SUPERADMIN && job.companyId !== user.companyId) {
            throw new AppError('Access denied.', 403);
        }

        // Fetch company's preferredPriceEnabled setting for the job's company
        const company = await tx.company.findUnique({
            where: { id: job.companyId },
            select: { preferredPriceEnabled: true },
        });
        const usePreferredPrice = company?.preferredPriceEnabled === true;

        // 2. Update scalar fields of the job
        const { jobMaterials, ...jobData } = data;
        const scalarUpdateData: any = {
            ...jobData,
            date: jobData.date ? new Date(jobData.date) : undefined,
            installDate: jobData.installDate ? new Date(jobData.installDate) : undefined,
        };
        await tx.job.update({
            where: { id },
            data: scalarUpdateData,
        });

        // 3. If jobMaterials are provided, replace them
        if (jobMaterials) {
            // A. Validate incoming variants and get their details
            const incomingVariantIntIds = jobMaterials.map(jm => Number(jm.variantId));
            const materialVariants = await tx.materialVariant.findMany({
                where: { variantId: { in: incomingVariantIntIds } },
                select: { 
                    id: true, 
                    variantId: true, 
                    materialId: true, 
                    regularPrice: true, // Include regularPrice
                    preferredPrice: true, // Include preferredPrice
                    material: { select: { unit: true } } 
                }
            });

            if (materialVariants.length !== incomingVariantIntIds.length) {
                throw new AppError('One or more provided material variants not found.', 404);
            }
            const variantIntIdToDetailsMap = new Map(materialVariants.map(v => [v.variantId, v]));

            // B. Delete all existing materials for the job
            await tx.jobMaterial.deleteMany({
                where: { jobId: id },
            });

            // C. Create the new set of materials
            if (jobMaterials.length > 0) {
                const newMaterialsData = jobMaterials.map(jm => {
                    const variantDetails = variantIntIdToDetailsMap.get(Number(jm.variantId));
                    if (!variantDetails) throw new AppError('Variant details not found.', 500); // Should be caught by length check

                    const costAtTime = usePreferredPrice ? variantDetails.preferredPrice : variantDetails.regularPrice;

                    return {
                        jobId: id,
                        materialId: variantDetails.materialId,
                        variantId: variantDetails.id, // The UUID for the foreign key
                        quantityUsed: jm.quantityUsed,
                        costAtTime: costAtTime, // Use the dynamically determined price
                        additionalQty: jm.additionalQty || 0,
                        additionalCost: jm.additionalCost || 0,
                        unit: variantDetails.material.unit,
                    };
                });
                await tx.jobMaterial.createMany({
                    data: newMaterialsData,
                });
            }
        }

        // 4. Return the fully updated job with the new materials
        return tx.job.findUnique({
            where: { id },
            include: { jobMaterials: true }
        });
    });
  }

  /**
   * Update Job Status
   * Restriction: Now handled by middleware (Company Admin, Production Manager, or Installer)
   */
  async updateJobStatus(id: string, status: JobStatus, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new AppError('Job not found', 404);

    // Object-level security check
    if (user.role !== UserRole.SUPERADMIN && job.companyId !== user.companyId) {
        throw new AppError('Access denied.', 403);
    }

    return prisma.job.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Archive a job
   * Restriction: Now handled by middleware (Company Admin or Production Manager)
   */
  async archiveJob(id: string, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new AppError('Job not found', 404);

    // Object-level security check
    if (user.role !== UserRole.SUPERADMIN && job.companyId !== user.companyId) {
      throw new AppError('Access denied.', 403);
    }

    return prisma.job.update({
      where: { id },
      data: { status: JobStatus.ARCHIVED }
    });
  }

  /**
   * List all archived jobs
   * Restriction: Superadmin (all), Company/Employee (own company only)
   */
  async listArchivedJobs(params: { page?: number, limit?: number; companyId?: string }, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const limit = params.limit || 10;
    const page = params.page || 1;
    
    const listParams = {
      ...params,
      page,
      limit,
      status: JobStatus.ARCHIVED
    };

    return this.listJobs(listParams, user);
  }

  /**
   * Get an archived job by ID
   * Restriction: Superadmin (all), Company/Employee (own company only)
   */
  async getArchivedJobById(id: string, user: any) {
    if (!user) {
      throw new AppError('Authentication required.', 401);
    }
    const job = await this.getJob(id, user);

    if (job && job.status !== JobStatus.ARCHIVED) {
      return null; // Job exists but is not archived
    }

    return job;
  }
}

export default new JobsService();
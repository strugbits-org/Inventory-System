import { Prisma, JobStatus, UserRole } from '@prisma/client';
import { prisma } from '../../db/db.service.js';
import { AppError } from '../../middleware/error.middleware.js';
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
   * Restriction: Company Admins only 
   */
  async createJob(data: CreateJobData, user: any) {
    if (user.role !== UserRole.COMPANY) {
        throw new AppError('Only company admins can create jobs.', 403);
    }

    const companyId = user.companyId;
    const locationId = user.locationId;

    if (!companyId) {
        throw new AppError('User does not belong to a company.', 400);
    }
    if (!locationId) {
        throw new AppError('User is not associated with a location.', 400);
    }

    // Check for duplicate jobId within the same company
    const existingJob = await prisma.job.findFirst({
        where: { jobId: data.jobId, companyId: companyId },
    });

    if (existingJob) {
        throw new AppError(`Job ID '${data.jobId}' already exists for this company.`, 409);
    }

    // 1. Validate Material Variants and their types
    const variantIds = data.jobMaterials.map(jm => Number(jm.variantId));
    const materialVariants = await prisma.materialVariant.findMany({
      where: {
        variantId: { in: variantIds },
      },
      select: {
        id: true,
        variantId: true,
        type: true,
        materialId: true,
        material: {
          select: {
            unit: true,
          },
        },
      },
    });

    if (materialVariants.length !== variantIds.length) {
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

    const variantIdToMaterialDetailsMap = new Map<number, typeof materialVariants[0]>();
    materialVariants.forEach(mv => variantIdToMaterialDetailsMap.set(mv.variantId, mv));

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
        const variantDetails = variantIdToMaterialDetailsMap.get(Number(jm.variantId));
        if (!variantDetails) throw new AppError('Variant details not found', 500);

        return {
          jobId: job.id,
          materialId: variantDetails.materialId,
          variantId: variantDetails.id, // Use UUID from lookup
          quantityUsed: jm.quantityUsed,
          costAtTime: jm.cost,
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

    if (user.role === UserRole.SUPERADMIN) {
      // If jobMaterials exist, transform the array to an object keyed by variantId
      if (job.jobMaterials) {
        (job as any).jobMaterials = job.jobMaterials.reduce((acc: any, material: any) => {
          if (material.variant && material.variant.variantId) {
            acc[material.variant.variantId] = material;
          }
          return acc;
        }, {});
      }
      return job;
    }

    // Company Admin & Employee Check
    if (job.companyId !== user.companyId) {
      throw new Error('Access denied: Job belongs to another company.');
    }

    // If jobMaterials exist, transform the array to an object keyed by variantId
    if (job.jobMaterials) {
      (job as any).jobMaterials = job.jobMaterials.reduce((acc: any, material: any) => {
        if (material.variant && material.variant.variantId) {
          acc[material.variant.variantId] = material;
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
  async listJobs(params: { cursor?: string, page?: number; limit?: number; companyId?: string; status?: JobStatus; search?: string, detailed?: boolean }, user: any) {
    const limit = params.limit || 10;
    const cursor = params.cursor;

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

    const jobs = await prisma.job.findMany({
        where,
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: includeClause
      });

    const nextCursor = jobs.length === limit ? jobs[jobs.length - 1].id : null;

    // Transform jobMaterials array to object for each job
    const transformedJobs = jobs.map(job => {
      if (job.jobMaterials) {
        (job as any).jobMaterials = job.jobMaterials.reduce((acc: any, material: any) => {
          if (material.variant && material.variant.variantId) {
            acc[material.variant.variantId] = material;
          }
          return acc;
        }, {});
      }
      return job;
    });


    return {
      jobs: transformedJobs,
      meta: {
        nextCursor
      }
    };
  }

  /**
   * Update Job Details
   * Restriction: Company Admin only (own company)
   */
  async updateJob(id: string, data: UpdateJobData, user: any) {
    return prisma.$transaction(async (prisma) => {
        // 1. Fetch job to verify ownership
        const job = await prisma.job.findUnique({ where: { id } });

        if (!job) {
            throw new AppError('Job not found', 404);
        }
        if (user.role !== UserRole.COMPANY || job.companyId !== user.companyId) {
            throw new AppError('Access denied.', 403);
        }

        // 2. Update scalar fields of the job
        const { jobMaterials, ...jobData } = data;
        const scalarUpdateData: any = {
            ...jobData,
            date: jobData.date ? new Date(jobData.date) : undefined,
            installDate: jobData.installDate ? new Date(jobData.installDate) : undefined,
        };
        await prisma.job.update({
            where: { id },
            data: scalarUpdateData,
        });

        // 3. If jobMaterials are provided, replace them
        if (jobMaterials) {
            // A. Validate incoming variants and get their details
            const incomingVariantIntIds = jobMaterials.map(jm => Number(jm.variantId));
            const materialVariants = await prisma.materialVariant.findMany({
                where: { variantId: { in: incomingVariantIntIds } },
                select: { id: true, variantId: true, materialId: true, material: { select: { unit: true } } }
            });

            if (materialVariants.length !== incomingVariantIntIds.length) {
                throw new AppError('One or more provided material variants not found.', 404);
            }
            const variantIntIdToDetailsMap = new Map(materialVariants.map(v => [v.variantId, v]));

            // B. Delete all existing materials for the job
            await prisma.jobMaterial.deleteMany({
                where: { jobId: id },
            });

            // C. Create the new set of materials
            if (jobMaterials.length > 0) {
                const newMaterialsData = jobMaterials.map(jm => {
                    const variantDetails = variantIntIdToDetailsMap.get(Number(jm.variantId));
                    if (!variantDetails) throw new AppError('Variant details not found.', 500); // Should be caught by length check
                    return {
                        jobId: id,
                        materialId: variantDetails.materialId,
                        variantId: variantDetails.id, // The UUID for the foreign key
                        quantityUsed: jm.quantityUsed,
                        costAtTime: jm.cost,
                        additionalQty: jm.additionalQty || 0,
                        additionalCost: jm.additionalCost || 0,
                        unit: variantDetails.material.unit,
                    };
                });
                await prisma.jobMaterial.createMany({
                    data: newMaterialsData,
                });
            }
        }

        // 4. Return the fully updated job with the new materials
        return prisma.job.findUnique({
            where: { id },
            include: { jobMaterials: true }
        });
    });
  }

  /**
   * Update Job Status
   * Restriction: Company Admin only (own company)
   */
  async updateJobStatus(id: string, status: JobStatus, user: any) {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error('Job not found');

    if (user.role !== UserRole.COMPANY) {
        throw new Error('Only company admins can update job status.');
    }
    
    if (job.companyId !== user.companyId) {
        throw new Error('Access denied.');
    }

    return prisma.job.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Archive a job
   * Restriction: Company Admin only (own company)
   */
  async archiveJob(id: string, user: any) {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new AppError('Job not found', 404);

    if (user.role !== UserRole.COMPANY) {
      throw new AppError('Only company admins can archive jobs.', 403);
    }

    if (job.companyId !== user.companyId) {
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
  async listArchivedJobs(params: { cursor?: string, limit?: number; companyId?: string }, user: any) {
    const limit = params.limit || 10;
    
    const listParams = {
      ...params,
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
    const job = await this.getJob(id, user);

    if (job && job.status !== JobStatus.ARCHIVED) {
      return null; // Job exists but is not archived
    }

    return job;
  }
}

export default new JobsService();
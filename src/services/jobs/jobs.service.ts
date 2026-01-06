import { Prisma, JobStatus, UserRole } from '@prisma/client';
import { prisma } from '../../db/db.service.js';
import { AppError } from '../../middleware/error.middleware.js';

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
    const locationId = user.locationId; // Extract locationId from user token

    if (!companyId) {
        throw new AppError('User does not belong to a company.', 400);
    }
    if (!locationId) {
        throw new AppError('User is not associated with a location.', 400);
    }

    // 1. Validate Material Variants
    const variantIds = data.jobMaterials.map(jm => jm.variantId);
    const materialVariants = await prisma.materialVariant.findMany({
      where: {
        id: { in: variantIds },
      },
      select: {
        id: true,
        type: true,
        materialId: true,
        material: { // Include the related Material to get the unit
          select: {
            unit: true,
          },
        },
      },
    });

    if (materialVariants.length !== variantIds.length) {
      throw new AppError('One or more material variants not found.', 404);
    }

    const foundTypes = {
      'base coat': 0,
      'top coat': 0,
      'broadcast': 0,
    };
    const variantIdToMaterialDetailsMap = new Map<string, typeof materialVariants[0]>();

    for (const mv of materialVariants) {
      if (mv.type in foundTypes) {
        foundTypes[mv.type as 'base coat' | 'top coat' | 'broadcast']++;
        variantIdToMaterialDetailsMap.set(mv.id, mv);
      } else {
        throw new AppError(`Invalid material variant type: ${mv.type}`, 400);
      }
    }

    if (foundTypes['base coat'] !== 1 || foundTypes['top coat'] !== 1 || foundTypes['broadcast'] !== 1) {
      throw new AppError('Exactly one base coat, one top coat, and one broadcast material variant are required.', 400);
    }

    // 2. Create Job and JobMaterials in a transaction
    return prisma.$transaction(async (prisma) => {
      const job = await prisma.job.create({
        data: {
          jobId: data.jobId,
          companyId: companyId,
          locationId: locationId, // Use locationId from token
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

      const jobMaterialsToCreate = data.jobMaterials.map(jm => ({
        jobId: job.id,
        materialId: variantIdToMaterialDetailsMap.get(jm.variantId)!.materialId,
        variantId: jm.variantId,
        quantityUsed: jm.quantityUsed,
        costAtTime: jm.cost,
        additionalQty: jm.additionalQty,
        additionalCost: jm.additionalCost,
        unit: variantIdToMaterialDetailsMap.get(jm.variantId)!.material.unit,
      }));

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
        jobMaterials: true
      }
    });

    if (!job) return null;

    if (user.role === UserRole.SUPERADMIN) {
      return job;
    }

    // Company Admin & Employee Check
    if (job.companyId !== user.companyId) {
      throw new Error('Access denied: Job belongs to another company.');
    }

    return job;
  }

  /**
   * List jobs
   * Restriction: Superadmin (all), Company/Employee (own company only)
   */
  async listJobs(params: { page?: number; limit?: number; companyId?: string; status?: JobStatus; search?: string }, user: any) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

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

    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { select: { name: true } },
          createdBy: { select: { firstName: true, lastName: true } }
        }
      })
    ]);

    return {
      jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update Job Details
   * Restriction: Company Admin only (own company)
   */
  async updateJob(id: string, data: UpdateJobData, user: any) {
    // 1. Fetch job to verify ownership
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error('Job not found');

    if (user.role !== UserRole.COMPANY) { 
        throw new Error('Only company admins can update jobs.');
    }

    if (job.companyId !== user.companyId) {
        throw new Error('Access denied.');
    }
    
    const updateData: any = {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      installDate: data.installDate ? new Date(data.installDate) : undefined,
    };

    return prisma.job.update({
      where: { id },
      data: updateData
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
  async listArchivedJobs(params: { page?: number; limit?: number; companyId?: string }, user: any) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    
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
    const job = await this.getJob(id, user);

    if (job && job.status !== JobStatus.ARCHIVED) {
      return null; // Job exists but is not archived
    }

    return job;
  }
}

export default new JobsService();
import { Prisma, JobStatus, UserRole } from '@prisma/client';
import { prisma } from '../../db/db.service.js';

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
  locationId: string;
  companyId?: string; // Optional if inferred from user
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
  locationId?: string;
}

export class JobsService {

  /**
   * Create a new job
   * Restriction: Company Admins only 
   */
  async createJob(data: CreateJobData, user: any) {
    if (user.role !== UserRole.COMPANY) {
        throw new Error('Only company admins can create jobs.');
    }

    const companyId = user.companyId;
    if (!companyId) {
        throw new Error('User does not belong to a company.');
    }

    return prisma.job.create({
      data: {
        jobId: data.jobId,
        companyId: companyId,
        locationId: data.locationId,
        createdByUserId: user.id || user.userId, 
        clientFirstName: data.clientFirstName,
        clientLastName: data.clientLastName,
        clientAddress: data.clientAddress,
        areaSqFt: data.areaSqFt,
        duration: data.duration,
        date: new Date(data.date),
        installDate: new Date(data.installDate),
        jobCost: data.jobCost || 0,
        status: JobStatus.PENDING
      }
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
  async listJobs(params: { page?: number; limit?: number; companyId?: string; status?: JobStatus }, user: any) {
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
}

export default new JobsService();
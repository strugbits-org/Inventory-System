import { Request, Response, NextFunction } from 'express';
import jobsServiceInstance, { JobsService } from '../../services/jobs/jobs.service.js';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class JobsController {
  private jobsService: JobsService;

  constructor(jobsService: JobsService = jobsServiceInstance) {
    this.jobsService = jobsService;
  }

  /**
   * Create Job
   * Route: POST /jobs
   */
  createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const job = await this.jobsService.createJob(req.body, user);

      return res.status(201).json(ApiResponse.success(job, 'Job created successfully', 201));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get Job
   * Route: GET /jobs/:id
   */
  getJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const job = await this.jobsService.getJob(id as string, user);
      if (!job) {
        throw new AppError('Job not found', 404);
      }

      return res.status(200).json(ApiResponse.success(job));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * List Jobs
   * Route: GET /jobs
   */
  listJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { cursor, limit, companyId, status, search, detailed } = req.query;

      const result = await this.jobsService.listJobs({
        cursor: cursor as string,
        limit: limit ? Number(limit) : 10,
        companyId: companyId as string,
        status: status as any,
        search: search as string,
        detailed: detailed === 'true',
      }, user);

      return res.status(200).json(ApiResponse.cursorPaginated(result.jobs, result.meta));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update Job
   * Route: PATCH /jobs/:id
   */
  updateJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const data = req.body;

      const updatedJob = await this.jobsService.updateJob(id as string, data, user);
      return res.status(200).json(ApiResponse.success(updatedJob, 'Job updated successfully'));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update Job Status
   * Route: PATCH /jobs/:id/status
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = (req as any).user;

      const updatedJob = await this.jobsService.updateJobStatus(id as string, status, user);
      return res.status(200).json(ApiResponse.success(updatedJob, 'Job status updated successfully'));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Archive Job
   * Route: DELETE /jobs/:id
   */
  archiveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const archivedJob = await this.jobsService.archiveJob(id as string, user);
      return res.status(200).json(ApiResponse.success(archivedJob, 'Job archived successfully'));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * List Archived Jobs
   * Route: GET /jobs/archived
   */
  listArchivedJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { cursor, limit, companyId } = req.query;

      const result = await this.jobsService.listArchivedJobs({
        cursor: cursor as string,
        limit: limit ? Number(limit) : 10,
        companyId: companyId as string,
      }, user);

      return res.status(200).json(ApiResponse.cursorPaginated(result.jobs, result.meta));
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get Archived Job By ID
   * Route: GET /jobs/archived/:id
   */
  getArchivedJobById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const job = await this.jobsService.getArchivedJobById(id as string, user);
      if (!job) {
        throw new AppError('Archived job not found', 404);
      }

      return res.status(200).json(ApiResponse.success(job));
    } catch (error: any) {
      next(error);
    }
  }
}

export default new JobsController();

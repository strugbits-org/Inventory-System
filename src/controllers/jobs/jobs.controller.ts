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

      const job = await this.jobsService.getJob(id, user);
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
      const { page, limit, companyId, status } = req.query;

      const result = await this.jobsService.listJobs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        companyId: companyId as string,
        status: status as any
      }, user);

      return res.status(200).json(ApiResponse.paginated(result.jobs, result.meta));
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

      const updatedJob = await this.jobsService.updateJob(id, data, user);
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

      const updatedJob = await this.jobsService.updateJobStatus(id, status, user);
      return res.status(200).json(ApiResponse.success(updatedJob, 'Job status updated successfully'));
    } catch (error: any) {
      next(error);
    }
  }
}

export default new JobsController();

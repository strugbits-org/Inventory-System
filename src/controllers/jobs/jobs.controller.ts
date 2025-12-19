import { Request, Response } from 'express';
import jobsService from '../../services/jobs/jobs.service.js';
import { JobStatus, UserRole } from '@prisma/client';

class JobsController {

  /**
   * Create Job
   * Route: POST /jobs
   */
  async createJob(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        jobId,
        clientFirstName,
        clientLastName,
        clientAddress,
        areaSqFt,
        duration,
        date,
        installDate,
        jobCost,
        locationId
      } = req.body;

      if (!jobId || !clientFirstName || !clientAddress || !areaSqFt || !duration || !date || !installDate || !locationId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const job = await jobsService.createJob({
        jobId,
        clientFirstName,
        clientLastName,
        clientAddress,
        areaSqFt,
        duration,
        date,
        installDate,
        jobCost,
        locationId
      }, user);

      res.status(201).json(job);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get Job
   * Route: GET /jobs/:id
   */
  async getJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const job = await jobsService.getJob(id, user);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json(job);
    } catch (error: any) {
      res.status(403).json({ error: error.message });
    }
  }

  /**
   * List Jobs
   * Route: GET /jobs
   */
  async listJobs(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { page, limit, companyId, status } = req.query;

      const result = await jobsService.listJobs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        companyId: companyId as string,
        status: status as JobStatus
      }, user);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update Job
   * Route: PATCH /jobs/:id
   */
  async updateJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const data = req.body;

      const updatedJob = await jobsService.updateJob(id, data, user);
      res.json(updatedJob);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Update Job Status
   * Route: PATCH /jobs/:id/status
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = (req as any).user;

      if (!status || !Object.values(JobStatus).includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      const updatedJob = await jobsService.updateJobStatus(id, status, user);
      res.json(updatedJob);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new JobsController();
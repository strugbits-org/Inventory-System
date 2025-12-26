import { Request, Response, NextFunction } from 'express';
import companiesService, { CompaniesService } from '../../services/companies/companies.service.js';
import { UserRole } from '@prisma/client';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class CompaniesController {
  private companiesService: CompaniesService;

  constructor(companiesServiceInstance: CompaniesService = companiesService) {
    this.companiesService = companiesServiceInstance;
  }

  /**
   * Create a company using an invite token
   * Public endpoint (protected by token)
   */
  createCompany = async (req: Request, res: Response, next: NextFunction) => {
      try {
          const result = await this.companiesService.createCompanyFromInvite(req.body);
          return res.status(201).json(ApiResponse.success(result, 'Company created successfully', 201));
      } catch (error: any) {
          next(error);
      }
  }

  /**
   * Get company details
   * Accessible by Superadmin and the Company's Admin
   */
  getCompany = async (req: Request, res: Response, next: NextFunction) => {
      try {
          const { id } = req.params;
          const user = (req as any).user;

          // Check access
          if (user.role !== UserRole.SUPERADMIN && user.companyId !== id) {
              throw new AppError('Access denied', 403);
          }

          const company = await this.companiesService.getCompany(id);
          if (!company) {
              throw new AppError('Company not found', 404);
          }
          return res.status(200).json(ApiResponse.success(company));
      } catch (error: any) {
          next(error);
      }
  }

   /**
    * List all companies
    * Accessible by Superadmin
    */
   listCompanies = async (req: Request, res: Response, next: NextFunction) => {
      try {
          const { page, limit, isActive } = req.query;
          const result = await this.companiesService.listCompanies({
              page: page ? Number(page) : 1,
              limit: limit ? Number(limit) : 10,
              isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
          });
          return res.status(200).json(ApiResponse.paginated(result.companies, result.meta));
      } catch (error: any) {
          next(error);
      }
  }

  /**
   * Update company details
   * Superadmin: Can update 'approvedBySuperadmin', 'name'
   * Company Admin: Can update 'name' only
   */
  updateCompany = async (req: Request, res: Response, next: NextFunction) => {
      try {
          const { id } = req.params;
          const { name, approvedBySuperadmin } = req.body;
          const user = (req as any).user;

          // Access Logic
          if (user.role === UserRole.SUPERADMIN) {
              // Can update everything
          } else if (user.role === UserRole.COMPANY && user.companyId === id) {
              // Can only update name
              if (approvedBySuperadmin !== undefined) {
                  throw new AppError('Only superadmin can approve companies', 403);
              }
          } else {
               throw new AppError('Access denied', 403);
          }

          const updated = await this.companiesService.updateCompany(id, { name, approvedBySuperadmin });
          return res.status(200).json(ApiResponse.success(updated, 'Company updated successfully'));
      } catch (error: any) {
          next(error);
      }
  }

  /**
   * Disable / Enable Company
   * Superadmin only
   */
  toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
       try {
           const { id } = req.params;
           const { isActive } = req.body;

           const updated = await this.companiesService.toggleCompanyStatus(id, isActive);
           return res.status(200).json(ApiResponse.success(updated, `Company ${isActive ? 'enabled' : 'disabled'} successfully`));
       } catch (error: any) {
           next(error);
       }
  }
}

export default new CompaniesController();


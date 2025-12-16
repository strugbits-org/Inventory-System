import { Request, Response } from 'express';
import companiesService from '../../services/companies/companies.service.js';
import { UserRole } from '@prisma/client';

class CompaniesController {

  /**
   * Create a company using an invite token
   * Public endpoint (protected by token)
   */
  async createCompany(req: Request, res: Response) {
      try {
          const { token, companyName, adminFirstName, adminLastName, adminPassword, initialLocationName } = req.body;
          
          if (!token || !companyName || !adminFirstName || !adminLastName || !adminPassword) {
              return res.status(400).json({ error: 'Missing required fields' });
          }

          const result = await companiesService.createCompanyFromInvite({
              token,
              companyName,
              adminFirstName,
              adminLastName,
              adminPassword,
              initialLocationName
          });
          
          res.status(201).json(result);
      } catch (error: any) {
          console.error(error);
          res.status(400).json({ error: error.message });
      }
  }

  /**
   * Get company details
   * Accessible by Superadmin and the Company's Admin
   */
  async getCompany(req: Request, res: Response) {
      try {
          const { id } = req.params;
          const user = (req as any).user;

          // Check access
          if (user.role !== UserRole.SUPERADMIN && user.companyId !== id) {
              return res.status(403).json({ error: 'Access denied' });
          }

          const company = await companiesService.getCompany(id);
          if (!company) {
              return res.status(404).json({ error: 'Company not found' });
          }
          res.json(company);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  }

   /**
    * List all companies
    * Accessible by Superadmin
    */
   async listCompanies(req: Request, res: Response) {
      try {
          // Note: Middleware should enforce Superadmin role for this, 
          // but we can double check or rely on routes.
          // Requirement: Superadmin: List all companies
          // Requirement: Company Admin: Not listed as having list capability.
          
          const { page, limit, isActive } = req.query;
          const result = await companiesService.listCompanies({
              page: page ? Number(page) : 1,
              limit: limit ? Number(limit) : 10,
              isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
          });
          res.json(result);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  }

  /**
   * Update company details
   * Superadmin: Can update 'approvedBySuperadmin', 'name'
   * Company Admin: Can update 'name' only
   */
  async updateCompany(req: Request, res: Response) {
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
                  return res.status(403).json({ error: 'Only superadmin can approve companies' });
              }
          } else {
               return res.status(403).json({ error: 'Access denied' });
          }

          const updated = await companiesService.updateCompany(id, { name, approvedBySuperadmin });
          res.json(updated);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  }

  /**
   * Disable / Enable Company
   * Superadmin only
   */
  async toggleStatus(req: Request, res: Response) {
       try {
           const { id } = req.params;
           const { isActive } = req.body; // Expect boolean

           if (isActive === undefined) {
               return res.status(400).json({ error: 'isActive is required' });
           }

           const updated = await companiesService.toggleCompanyStatus(id, isActive);
           res.json(updated);
       } catch (error: any) {
           res.status(500).json({ error: error.message });
       }
  }
}

export default new CompaniesController();

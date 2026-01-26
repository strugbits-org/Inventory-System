import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../db/db.service.js';
import inviteService from '../invites/invite.service.js';
import { hashPassword } from '../../utils/helpers.js';
import { AppError } from '../../middleware/error.middleware.js';
import { JwtPayload } from '../../middleware/jwtAuth.js';

export class CompaniesService {

  /**
   * Create a company from an invite token
   */
  async createCompanyFromInvite(data: {
    token: string;
    companyName: string;
    adminFirstName: string;
    adminLastName: string;
    adminPassword: string;
    adminEmail: string;
    initialLocationName?: string;
  }) {
    // 1. Verify token
    const inviteInfo = await inviteService.verifyInviteToken(data.token);

    if (inviteInfo.role !== UserRole.COMPANY) {
        throw new Error('This invite is not for a company admin.');
    }

    // 2. Transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create Company
        const company = await tx.company.create({
            data: {
                name: data.companyName,
                email: inviteInfo.email,
                isActive: true, 
                approvedBySuperadmin: false 
            }
        });

        // Create Location
        const location = await tx.location.create({
            data: {
                name: data.initialLocationName || 'Main Office',
                companyId: company.id,
                approvedBySuperadmin: true 
            }
        });

        // Create Admin User
        const hashedPassword = await hashPassword(data.adminPassword);
        const user = await tx.user.create({
            data: {
                email: data.adminEmail,
                password: hashedPassword,
                firstName: data.adminFirstName,
                lastName: data.adminLastName,
                role: UserRole.COMPANY,
                companyId: company.id,
                locationId: location.id,
                isActive: true
            }
        });

        // Update Company with admin
        await tx.company.update({
            where: { id: company.id },
            data: { companyAdminId: user.id }
        });

        // Update Invite
        await tx.invite.update({
            where: { id: inviteInfo.inviteId },
            data: {
                accepted: true,
                companyId: company.id,
                locationId: location.id
            }
        });

        return { company, user, location };
    });

    return result;
  }

  /**
   * Get company by ID
   */
  async getCompany(id: string) {
    return prisma.company.findUnique({
        where: { id },
        include: {
            locations: true,
            companyAdmin: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
  }

  /**
   * Update company details
   */
  async updateCompany(id: string, data: { name?: string; approvedBySuperadmin?: boolean }) {
      return prisma.company.update({
          where: { id },
          data
      });
  }

  /**
   * Toggle company active status
   */
  async toggleCompanyStatus(id: string, isActive: boolean) {
      return prisma.company.update({
          where: { id },
          data: { isActive }
      });
  }

  /**
   * List companies with pagination and filtering
   */
  async listCompanies(params: { cursor?: string, limit?: number; isActive?: boolean, search?: string }) {
      const limit = params.limit || 10;
      const cursor = params.cursor;

      const where: Prisma.CompanyWhereInput = {};
      if (params.isActive !== undefined) {
          where.isActive = params.isActive;
      }

      if (params.search) {
        const search = params.search.trim();

        where.OR = [
            {
                name: {
                contains: search,
                mode: 'insensitive'
                }
            },
            {
                email: {
                contains: search,
                mode: 'insensitive'
                }
            }
        ];
      }

      const companies = await prisma.company.findMany({
              where,
              take: limit,
              skip: cursor ? 1 : 0,
              cursor: cursor ? { id: cursor } : undefined,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              include: {
                  companyAdmin: {
                      select: {
                          firstName: true,
                          lastName: true,
                          email: true
                      }
                  },
                  _count: {
                      select: { locations: true, users: true }
                  }
              }
          });

      const nextCursor = companies.length === limit ? companies[companies.length - 1].id : null;

      return {
          companies,
          meta: {
              nextCursor
          }
      };
  }

  /**
   * Update company and optionally a location in a single transaction
   */
  async updateCompanyAndLocation(
    companyId: string, 
    user: JwtPayload,
    companyData: { name?: string; approvedBySuperadmin?: boolean }, 
    locationData?: { id: string; name?: string; street?: string; city?: string; state?: string; postalCode?: string; country?: string }
  ) {
    return prisma.$transaction(async (tx) => {
      let updatedCompany = null;
      let updatedLocation = null;

      // 1. Update Company details if provided
      if (companyData.name) {
        updatedCompany = await tx.company.update({
          where: { id: companyId },
          data: { name: companyData.name },
        });
      }

      // If user is superadmin, they can also approve
      if (user.role === UserRole.SUPERADMIN && companyData.approvedBySuperadmin !== undefined) {
        updatedCompany = await tx.company.update({
          where: { id: companyId },
          data: { approvedBySuperadmin: companyData.approvedBySuperadmin },
        });
      }

      // 2. Update Location details if provided
      if (locationData) {
        const { id: locationId, ...locationFieldsToUpdate } = locationData;

        // Security check: Ensure the location belongs to the company, unless user is a superadmin
        if (user.role !== UserRole.SUPERADMIN) {
          const location = await tx.location.findUnique({
            where: { id: locationId },
            select: { companyId: true },
          });

          if (!location || location.companyId !== user.companyId) {
            throw new AppError('Location not found or access denied.', 404);
          }
        }
        
        // Only update if there are fields to update
        if (Object.keys(locationFieldsToUpdate).length > 0) {
            updatedLocation = await tx.location.update({
                where: { id: locationId },
                data: locationFieldsToUpdate,
            });
        }
      }

      // 3. Fetch the final state of the company to return all data
      const finalCompanyState = await tx.company.findUnique({
          where: { id: companyId },
          include: { locations: true, companyAdmin: true },
      });

      return finalCompanyState;
    });
  }
}

export default new CompaniesService();
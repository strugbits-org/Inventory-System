import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../db/db.service.js';
import inviteService from '../invites/invite.service.js';
import { hashPassword } from '../../utils/helpers.js';

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
  async listCompanies(params: { page?: number; limit?: number; isActive?: boolean }) {
      const page = params.page || 1;
      const limit = params.limit || 10;
      const skip = (page - 1) * limit;

      const where: Prisma.CompanyWhereInput = {};
      if (params.isActive !== undefined) {
          where.isActive = params.isActive;
      }

      const [total, companies] = await Promise.all([
          prisma.company.count({ where }),
          prisma.company.findMany({
              where,
              skip,
              take: limit,
              orderBy: { createdAt: 'desc' },
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
          })
      ]);

      return {
          companies,
          meta: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit)
          }
      };
  }
}

export default new CompaniesService();
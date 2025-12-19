import { Request, Response } from 'express';
import UsersService from '../../services/user/users.service.js';
import { UserRole } from '@prisma/client';

class UsersController {
    private usersService: UsersService;

    constructor() {
        this.usersService = new UsersService();
    }

    /**
     * Get user by ID
     * Accessible by: SUPERADMIN (all users), COMPANY (same company users), EMPLOYEE (own data)
     */
    async getUserById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const currentUser = (req as any).user;

            // Fetch user
            const user = await this.usersService.getUserById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Access control
            if (currentUser.role === UserRole.SUPERADMIN) {
                // Superadmin can access any user
            } else if (currentUser.role === UserRole.COMPANY && currentUser.companyId === user.companyId) {
                // Company admin can access users in their company
            } else if (currentUser.id === id) {
                // User can access their own data
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Remove password from response
            const { password, ...userWithoutPassword } = user;

            return res.status(200).json({
                success: true,
                message: 'User retrieved successfully',
                data: userWithoutPassword
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    /**
     * Get users by company ID with pagination
     * Accessible by: SUPERADMIN (all companies), COMPANY (own company only)
     */
    async getUsersByCompanyId(req: Request, res: Response) {
        try {
            const { companyId } = req.params;
            const { page, limit } = req.query;
            const currentUser = (req as any).user;

            // Access control
            if (currentUser.role !== UserRole.SUPERADMIN && currentUser.companyId !== companyId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Fetch paginated users
            const result = await this.usersService.getUsersByCompanyId(
                companyId,
                {
                    page: page ? Number(page) : 1,
                    limit: limit ? Number(limit) : 10
                },
                {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    companyId: true,
                    locationId: true,
                    createdAt: true,
                    updatedAt: true
                    // Explicitly exclude password
                }
            );

            return res.status(200).json({
                success: true,
                message: 'Users retrieved successfully',
                data: result.data,
                pagination: result.pagination
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }
}

export default new UsersController();

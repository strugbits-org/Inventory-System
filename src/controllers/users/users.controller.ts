import { Request, Response, NextFunction } from 'express';
import UsersService from '../../services/users/users.service.js';
import { UserRole } from '@prisma/client';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class UsersController {
    private usersService: UsersService;

    constructor(usersService: UsersService = new UsersService()) {
        this.usersService = usersService;
    }

    /**
     * Get user by ID
     * Accessible by: SUPERADMIN (all users), COMPANY (same company users), EMPLOYEE (own data)
     */
    getUserById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const currentUser = (req as any).user;

            // Fetch user
            const user = await this.usersService.getUserById(id);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Access control
            if (currentUser.role === UserRole.SUPERADMIN) {
                // Superadmin can access any user
            } else if (currentUser.role === UserRole.COMPANY && currentUser.companyId === user.companyId) {
                // Company admin can access users in their company
            } else if (currentUser.userId === id) { // Fixed: using currentUser.userId instead of currentUser.id
                // User can access their own data
            } else {
                throw new AppError('Access denied', 403);
            }

            // Remove password from response
            const { password, ...userWithoutPassword } = user;

            return res.status(200).json(ApiResponse.success(userWithoutPassword, 'User retrieved successfully'));
        } catch (error: any) {
            next(error);
        }
    }

    /**
     * Get users by company ID with pagination
     * Accessible by: SUPERADMIN (all companies), COMPANY (own company only)
     */
    getUsersByCompanyId = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { companyId } = req.params;
            const { page, limit } = req.query;
            const currentUser = (req as any).user;

            // Access control
            if (currentUser.role !== UserRole.SUPERADMIN && currentUser.companyId !== companyId) {
                throw new AppError('Access denied', 403);
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

            return res.status(200).json(ApiResponse.paginated(result.data, result.pagination, 'Users retrieved successfully'));
        } catch (error: any) {
            next(error);
        }
    }
}

export default new UsersController();


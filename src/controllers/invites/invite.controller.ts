import { Request, Response, NextFunction } from 'express';
import inviteServiceInstance, { InviteService } from '../../services/invites/invite.service.js';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class InviteController {
  private inviteService: InviteService;

  constructor(inviteService: InviteService = inviteServiceInstance) {
    this.inviteService = inviteService;
  }

  /**
   * POST /superadmin/company-invite
   * Create a new company invite
   */
  createCompanyInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.inviteService.createCompanyInvite({
        companyEmail: req.body.companyEmail,
      });

      return res.status(201).json(ApiResponse.success(result, 'Company invite created and email sent successfully', 201));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /superadmin/company-invites
   * Get all pending company invites
   */
  getPendingInvites = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invites = await this.inviteService.getPendingCompanyInvites();

      return res.status(200).json(ApiResponse.success(invites, 'Pending invites retrieved', 200));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /invite/verify
   * Verify an invite token (public endpoint)
   */
  verifyInviteToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inviteData = await this.inviteService.verifyInviteToken(req.body.token);

      return res.status(200).json(ApiResponse.success(inviteData, 'Token is valid'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /superadmin/company-invite/:inviteId
   * Cancel a pending invite
   */
  cancelInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { inviteId } = req.params;

      if (!inviteId) {
        throw new AppError('Invite ID is required', 400);
      }

      const result = await this.inviteService.cancelInvite(inviteId);

      return res.status(200).json(ApiResponse.success(null, result.message));
    } catch (error) {
      next(error);
    }
  }
}

export default new InviteController();


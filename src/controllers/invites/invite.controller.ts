import { Request, Response, NextFunction } from 'express';
import inviteServiceInstance, { InviteService } from '../../services/invites/invite.service.js';
import ApiResponse from '../../utils/response.js';
import { AppError } from '../../middleware/error.middleware.js';

class InviteController {
  private inviteService: InviteService;

  constructor(inviteService: InviteService = inviteServiceInstance) {
    this.inviteService = inviteService;
  }

  createCompanyInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyName, email } = req.body;
      if (!companyName || !email) {
        throw new AppError('companyName and email are required', 400);
      }
      const result = await this.inviteService.createCompanyInvite({ companyName, email });
      return res.status(201).json(ApiResponse.success(result, 'Company invitation sent successfully'));
    } catch (error) {
      next(error);
    }
  };

  getPendingInvites = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invites = await this.inviteService.getPendingCompanyInvites();
      return res.status(200).json(ApiResponse.success(invites, 'Pending invites retrieved'));
    } catch (error) {
      next(error);
    }
  };

  verifyInviteToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      if (!token) {
        throw new AppError('Invite token is required', 400);
      }
      const inviteData = await this.inviteService.verifyInviteToken(token);
      return res.status(200).json(ApiResponse.success(inviteData, 'Token is valid'));
    } catch (error) {
      next(error);
    }
  };

  acceptCompanyInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Basic validation
      const requiredFields = [
        'token', 'companyName', 'companyEmail', 'country', 'city',
        'firstName', 'lastName', 'adminEmail', 'password'
      ];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          throw new AppError(`${field} is required`, 400);
        }
      }

      const result = await this.inviteService.acceptCompanyInvite(req.body);

      // Note: The service returns tokens, so you might want to set cookies here
      return res.status(201).json(ApiResponse.success(result, 'User registered and company created successfully'));
    } catch (error) {
      next(error);
    }
  };

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
  };
}

export default new InviteController();
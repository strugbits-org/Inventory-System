import { Request, Response, NextFunction } from 'express';
import inviteService from '../../services/invites/invite.service';
import Joi from 'joi';

class InviteController {
  /**
   * POST /superadmin/company-invite
   * Create a new company invite
   */
  async createCompanyInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = Joi.object({
        companyEmail: Joi.string().email().required(),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail) => detail.message),
        });
      }

      const result = await inviteService.createCompanyInvite({
        companyEmail: value.companyEmail,
      });

      return res.status(201).json({
        success: true,
        message: 'Company invite created and email sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /superadmin/company-invites
   * Get all pending company invites
   */
  async getPendingInvites(req: Request, res: Response, next: NextFunction) {
    try {
      const invites = await inviteService.getPendingCompanyInvites();

      return res.status(200).json({
        success: true,
        data: invites,
        count: invites.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /invite/verify
   * Verify an invite token (public endpoint)
   */
  async verifyInviteToken(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = Joi.object({
        token: Joi.string().required(),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map((detail) => detail.message),
        });
      }

      const inviteData = await inviteService.verifyInviteToken(value.token);

      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: inviteData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /superadmin/company-invite/:inviteId
   * Cancel a pending invite
   */
  async cancelInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { inviteId } = req.params;

      if (!inviteId) {
        return res.status(400).json({
          success: false,
          message: 'Invite ID is required',
        });
      }

      const result = await inviteService.cancelInvite(inviteId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new InviteController();

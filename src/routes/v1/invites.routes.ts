import express from 'express';
import Joi from 'joi';
import inviteController from '../../controllers/invites/invite.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.middleware.js';

const inviteRoutes = express.Router();

const companyInviteSchema = Joi.object({
  companyEmail: Joi.string().email().required(),
});

const verifyTokenSchema = Joi.object({
  token: Joi.string().required(),
});

/**
 * Superadmin routes - require superadmin authentication
 */

inviteRoutes.post(
  '/company-invite',
  authenticateToken,
  requireSuperAdmin,
  validate(companyInviteSchema),
  inviteController.createCompanyInvite
);

inviteRoutes.get(
  '/company-invites',
  authenticateToken,
  requireSuperAdmin,
  inviteController.getPendingInvites
);

inviteRoutes.delete(
  '/company-invite/:inviteId',
  authenticateToken,
  requireSuperAdmin,
  inviteController.cancelInvite
);

/**
 * Public routes - no authentication required
 */

// Verify an invite token (used by the company when they click the link)
inviteRoutes.post('/invite/verify', validate(verifyTokenSchema), inviteController.verifyInviteToken);

export default inviteRoutes;


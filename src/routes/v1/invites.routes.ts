import express from 'express';
import inviteController from '../../controllers/invites/invite.controller.js';
import { authenticateToken } from '../../middleware/jwtAuth.js';
import { requireSuperAdmin } from '../../middleware/superadmin.js';

const inviteRoutes = express.Router();

/**
 * Superadmin routes - require superadmin authentication
 */

inviteRoutes.post(
  '/company-invite',
  authenticateToken,
  requireSuperAdmin,
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
inviteRoutes.post('/invite/verify', inviteController.verifyInviteToken);

export default inviteRoutes;

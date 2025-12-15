import express from 'express';
import inviteController from '../controllers/invites/invite.controller';
import { authenticateToken } from '../middleware/jwtAuth';
import { requireSuperAdmin } from '../middleware/superadmin';

const inviteRoutes = express.Router();

/**
 * Superadmin routes - require superadmin authentication
 */

inviteRoutes.post(
  '/v1/company-invite',
  authenticateToken,
  requireSuperAdmin,
  inviteController.createCompanyInvite
);

inviteRoutes.get(
  '/v1/company-invites',
  // authenticateToken,
  // requireSuperAdmin,
  inviteController.getPendingInvites
);

inviteRoutes.delete(
  '/v1/company-invite/:inviteId',
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

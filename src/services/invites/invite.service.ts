import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendInviteEmail } from '../../utils/email.util.js';
import { prisma } from '../../db/db.service.js';

interface CreateCompanyInviteInput {
  companyEmail: string;
}

interface InviteTokenPayload {
  inviteId: string;
  companyEmail: string;
  role: UserRole;
  exp: number;
}

export class InviteService {
  /**
   * Create a company invite
   * Validates email uniqueness, generates token, stores invite, and sends email
   */
  async createCompanyInvite(input: CreateCompanyInviteInput) {
    const { companyEmail } = input;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      throw new Error('Invalid email format');
    }

    const existingCompany = await prisma.company.findUnique({
      where: { email: companyEmail },
    });

    if (existingCompany) {
      throw new Error('A company with this email already exists');
    }

    const existingInvite = await prisma.invite.findFirst({
      where: {
        email: companyEmail,
        role: UserRole.COMPANY,
        accepted: false,
        expiresAt: {
          gte: new Date(), // Not expired
        },
      },
    });

    if (existingInvite) {
      throw new Error('A pending invite already exists for this email');
    }

    const inviteExpire = Number(process.env.INVITE_EXPIRY_HOURS);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + inviteExpire);

    const invite = await prisma.invite.create({
      data: {
        email: companyEmail,
        role: UserRole.COMPANY,
        expiresAt,
        token: 'PLACEHOLDER',
      },
    });

    const tokenPayload: InviteTokenPayload = {
      inviteId: invite.id,
      companyEmail: invite.email,
      role: invite.role,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(tokenPayload, jwtSecret);

    const updatedInvite = await prisma.invite.update({
      where: { id: invite.id },
      data: { token },
    });

    const inviteLink = `${process.env.APP_URL}/company/onboarding?token=${token}`;
    
    try {
      await sendInviteEmail({
        to: companyEmail,
        inviteLink,
        expiresAt,
      });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
    }

    return {
      id: updatedInvite.id,
      email: updatedInvite.email,
      role: updatedInvite.role,
      token: updatedInvite.token, // we will remove this token
      expiresAt: updatedInvite.expiresAt,
      createdAt: updatedInvite.createdAt,
      emailSent: true,
    };
  }

  /**
   * Verify an invite token
   * Used when the company clicks the invite link
   */
  async verifyInviteToken(token: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as InviteTokenPayload;

      const invite = await prisma.invite.findUnique({
        where: { token },
      });

      if (!invite) {
        throw new Error('Invite not found');
      }

      if (invite.accepted) {
        throw new Error('Invite has already been accepted');
      }

      if (new Date() > invite.expiresAt) {
        throw new Error('Invite has expired');
      }

      return {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      throw error;
    }
  }

  /**
   * Get all pending company invites (for superadmin dashboard)
   */
  async getPendingCompanyInvites() {
    const invites = await prisma.invite.findMany({
      where: {
        role: UserRole.COMPANY,
        accepted: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return invites;
  }

  /**
   * Cancel/delete a pending invite
   */
  async cancelInvite(inviteId: string) {
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.accepted) {
      throw new Error('Cannot cancel an accepted invite');
    }

    await prisma.invite.delete({
      where: { id: inviteId },
    });

    return { message: 'Invite cancelled successfully' };
  }
}

export default new InviteService();

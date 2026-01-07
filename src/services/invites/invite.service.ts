import { requireCompanyAdminOrSuperAdmin } from './../../middleware/rbac';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendInviteEmail } from '../../utils/email.util.js';
import { prisma } from '../../db/db.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import JwtService from '../jwt/jwt.service.js';

interface CreateCompanyInviteInput {
  companyName: string;
  email: string;
}

interface AcceptCompanyInviteInput {
  token: string;
  companyName: string;
  companyEmail: string;
  country: string;
  city: string;
  postalCode?: string;
  street?: string;
  state?: string;
  firstName: string;
  lastName: string;
  adminEmail: string;
  adminPhone?: string;
  password: string;
}

interface InviteTokenPayload {
  inviteId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export class InviteService {
  private jwtService = new JwtService();

  async createCompanyInvite(input: CreateCompanyInviteInput) {
    const { companyName, email } = input;

    // Validate company name
    if (!companyName || companyName.trim().length === 0) {
      throw new AppError('Company name is required', 400);
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Check for existing company or pending invite
    const existingCompany = await prisma.company.findFirst({
      where: { OR: [{ name: companyName }, { email }] },
    });
    if (existingCompany) {
      throw new AppError('A company with this name or email already exists', 409);
    }

    const existingInvite = await prisma.invite.findFirst({
      where: { email, accepted: false, expiresAt: { gte: new Date() } },
    });
    if (existingInvite) {
      throw new AppError('A pending invite already exists for this email', 409);
    }

    // Create placeholder company and invite
    const inviteExpire = Number(process.env.INVITE_EXPIRY_HOURS) || 24;
    const expiresAt = new Date(Date.now() + inviteExpire * 3600 * 1000);

    const { company, invite } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          email: email, // Placeholder, will be updated by admin
          approvedBySuperadmin: false, // Superadmin must approve
          isActive: false, // Company is inactive until onboarded
        },
      });

      const invite = await tx.invite.create({
        data: {
          email,
          companyId: company.id,
          role: UserRole.COMPANY,
          expiresAt,
          token: 'TBD',
        },
      });
      return { company, invite };
    });

    // Generate JWT for the invite link
    const tokenPayload = {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: `${inviteExpire}h` });
    
    // Update invite with the actual token
    const updatedInvite = await prisma.invite.update({
      where: { id: invite.id },
      data: { token },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true }
    });

    // Send email
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
    await sendInviteEmail({
      to: email,
      inviteLink,
      companyName,
      expiresAt,
      expiresInHours: inviteExpire,
    });

    return { ...updatedInvite, emailSent: true };
  }

  async verifyInviteToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as InviteTokenPayload;

      const invite = await prisma.invite.findFirst({
        where: { id: decoded.inviteId, token, accepted: false },
        include: { company: { select: { name: true } } },
      });

      if (!invite) {
        throw new AppError('Invite not found or already accepted', 404);
      }
      if (new Date() > invite.expiresAt) {
        throw new AppError('Invite has expired', 410);
      }

      return {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
        companyName: invite.company?.name || '',
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Invite has expired', 410);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid invite token', 401);
      }
      throw error;
    }
  }

  async acceptCompanyInvite(input: AcceptCompanyInviteInput) {
    const {
      token,
      companyName,
      companyEmail,
      country,
      city,
      postalCode,
      street,
      state,
      firstName,
      lastName,
      adminEmail,
      adminPhone,
      password,
    } = input;

    // 1. Verify token and find invite
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as InviteTokenPayload;
    const invite = await prisma.invite.findUnique({
      where: { id: decoded.inviteId },
    });

    if (!invite || invite.token !== token || invite.accepted) {
      throw new AppError('Invite not found or already accepted', 404);
    }
    if (new Date() > invite.expiresAt) {
      throw new AppError('Invite has expired', 410);
    }

    // 2. Check for uniqueness of company name/email before proceeding
    const existingCompany = await prisma.company.findFirst({
        where: {
            OR: [{ name: companyName }, { email: companyEmail }],
            id: { not: invite.companyId! } // Exclude the placeholder company linked to the invite
        },
    });
    if (existingCompany) {
        throw new AppError('A company with this name or email already exists.', 409);
    }


    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Update Company with final details
      const updatedCompany = await tx.company.update({
        where: { id: invite.companyId! },
        data: {
          name: companyName,
          email: companyEmail,
          isActive: true, // Activate company upon onboarding
        },
      });

      // b. Create the primary Location
      const location = await tx.location.create({
        data: {
          companyId: updatedCompany.id,
          name: `${companyName} - Headquarters`,
          street,
          city,
          state,
          postalCode,
          country,
          approvedBySuperadmin: true, // First location is auto-approved
        },
      });

      // c. Create the Company Admin User
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          phone: adminPhone,
          password: hashedPassword,
          firstName,
          lastName,
          role: UserRole.COMPANY,
          companyId: updatedCompany.id,
          locationId: location.id, // Assign to the new location
        },
      });

      // d. Link user as the Company Admin
      await tx.company.update({
        where: { id: updatedCompany.id },
        data: { companyAdminId: adminUser.id },
      });

      // e. Mark invite as accepted
      await tx.invite.update({
        where: { id: invite.id },
        data: { accepted: true },
      });

      return { adminUser, company: updatedCompany };
    });

    // 5. Generate JWTs
    const { accessToken, refreshToken } = await this.jwtService.createTokens(result.adminUser);

    return {
      user: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        firstName: result.adminUser.firstName,
        lastName: result.adminUser.lastName,
        role: result.adminUser.role,
        companyId: result.company.id,
      },
      token: accessToken,
      refreshToken,
    };
  }

  async getPendingCompanyInvites() {
    return prisma.invite.findMany({
        where: {
            role: UserRole.COMPANY,
            accepted: false,
            expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            email: true,
            expiresAt: true,
            createdAt: true,
            company: { select: { name: true } }
        },
    });
  }

  async cancelInvite(inviteId: string) {
    const invite = await prisma.invite.findUnique({
        where: { id: inviteId },
        select: { accepted: true, companyId: true }
    });

    if (!invite) {
        throw new AppError('Invite not found', 404);
    }
    if (invite.accepted) {
        throw new AppError('Cannot cancel an accepted invite', 400);
    }
    
    // Within a transaction, delete the invite and its associated placeholder company
    await prisma.$transaction(async (tx) => {
        await tx.invite.delete({ where: { id: inviteId }});
        if (invite.companyId) {
            await tx.company.delete({ where: { id: invite.companyId }});
        }
    });

    return { message: 'Invite and placeholder company cancelled successfully' };
  }
}

export default new InviteService();
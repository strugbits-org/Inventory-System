import nodemailer from 'nodemailer';
import { companyInviteEmailTemplate } from './email-templates/company-invite.template';

interface SendInviteEmailParams {
  to: string;
  inviteLink: string;
  expiresAt: Date;
}

const createTransporter = () => {
  const emailUser = process.env.SMTP_USER;
  const emailPassword = process.env.SMTP_PASS;

  if (!emailUser || !emailPassword) {
    throw new Error('Email configuration missing. Please set SMTP_USER and SMTP_PASS in .env');
  }

  return nodemailer.createTransport({

    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

export const sendInviteEmail = async (params: SendInviteEmailParams): Promise<void> => {
  const { to, inviteLink, expiresAt } = params;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'ResinWerks'}" <${process.env.SMTP_USER}>`,
    to,
    subject: 'You\'re Invited to Join ResinWerks',
    html: companyInviteEmailTemplate({ inviteLink, expiresAt }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send invitation email');
  }
};

export const testEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

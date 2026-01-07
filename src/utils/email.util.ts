import nodemailer from 'nodemailer';
import { companyInviteEmailTemplate } from './email-templates/company-invite.template.js';
import { newUserCredentialsEmailTemplate } from './email-templates/new-user-credentials.template.js';
import { forgotPasswordEmailTemplate } from './email-templates/forgot-password.template.js';

interface SendInviteEmailParams {
  to: string;
  inviteLink: string;
  companyName: string;
  expiresAt: Date;
  expiresInHours: number;
}

const createTransporter = () => {
  // ... (transporter creation logic remains the same)
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
  const { to, inviteLink, companyName, expiresAt, expiresInHours } = params;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'ResinWerks'}" <${process.env.SMTP_USER}>`,
    to,
    subject: `You're Invited to Join ${companyName} on ResinWerks`,
    html: companyInviteEmailTemplate({ inviteLink, companyName, expiresAt, expiresInHours }),
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

interface SendNewUserCredentialsEmailParams {
  to: string;
  name: string;
  companyName: string;
  loginUrl: string;
  password: string;
}

export const sendNewUserCredentialsEmail = async (params: SendNewUserCredentialsEmailParams): Promise<void> => {
  const { to, name, companyName, loginUrl, password } = params;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'ResinWerks'}" <${process.env.SMTP_USER}>`,
    to,
    subject: `Welcome to ${companyName} - Your Login Credentials`,
    html: newUserCredentialsEmailTemplate({ name, companyName, loginUrl, email: to, password }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Credentials email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending credentials email:', error);
  }
};

interface SendForgotPasswordEmailParams {
  to: string;
  name: string;
  resetLink: string;
  expiresInMinutes: number;
}

export const sendForgotPasswordEmail = async (params: SendForgotPasswordEmailParams): Promise<void> => {
  const { to, name, resetLink, expiresInMinutes } = params;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'ResinWerks'}" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Your Password - ResinWerks',
    html: forgotPasswordEmailTemplate({ name, resetLink, expiresInMinutes }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email. Please try again.');
  }
};

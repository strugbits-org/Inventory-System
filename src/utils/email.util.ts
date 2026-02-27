import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';

sgMail.setApiKey(env.SENDGRID_API_KEY);

const sendEmail = async (to: string, subject: string, html: string, fromOverride?: string) => {
  const msg = {
    to,
    from: fromOverride || env.SMTP_FROM,
    subject,
    text: html.replace(/<[^>]*>?/gm, ''), // Basic HTML stripping for text version
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
  } catch (error: any) {
    console.error(`Error sending email to ${to}:`, error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error('Failed to send email.');
  }
};

// All specific email functions will now use the generic sendEmail function.
// The email templates will need to be adjusted to be simple functions returning HTML strings.

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

export const sendInviteEmail = async (params: SendInviteEmailParams): Promise<void> => {
  const { to, inviteLink, companyName, expiresAt, expiresInHours } = params;
  const subject = `You're Invited to Join ${companyName} on ResinWerks`;
  const html = companyInviteEmailTemplate({ inviteLink, companyName, expiresAt, expiresInHours });
  await sendEmail(to, subject, html);
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
  const subject = `Welcome to ${companyName} - Your Login Credentials`;
  const html = newUserCredentialsEmailTemplate({ name, companyName, loginUrl, email: to, password });
  await sendEmail(to, subject, html);
};

interface SendForgotPasswordEmailParams {
  to: string;
  name: string;
  resetLink: string;
  expiresInMinutes: number;
}

export const sendForgotPasswordEmail = async (params: SendForgotPasswordEmailParams): Promise<void> => {
  const { to, name, resetLink, expiresInMinutes } = params;
  const subject = 'Reset Your Password - ResinWerks';
  const html = forgotPasswordEmailTemplate({ name, resetLink, expiresInMinutes });
  await sendEmail(to, subject, html);
};

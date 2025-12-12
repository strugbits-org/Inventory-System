interface CompanyInviteEmailParams {
  inviteLink: string;
  expiresAt: Date;
}

export const companyInviteEmailTemplate = (params: CompanyInviteEmailParams): string => {
  const { inviteLink, expiresAt } = params;

  const expirationDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Company Invitation - ResinWerks</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #4b5563;
          margin-bottom: 15px;
        }
        .cta-button {
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .cta-button:hover {
          background-color: #1d4ed8;
        }
        .info-box {
          background-color: #f3f4f6;
          border-left: 4px solid #2563eb;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
        .link-fallback {
          word-break: break-all;
          font-size: 12px;
          color: #6b7280;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏗️ ResinWerks</div>
        </div>

        <h1>You're Invited to Join ResinWerks!</h1>

        <p>Hello,</p>

        <p>
          You've been invited to join <strong>ResinWerks</strong> as a company administrator. 
          ResinWerks is a comprehensive inventory and job management system designed specifically 
          for resin flooring businesses.
        </p>

        <p>
          Click the button below to accept your invitation and complete your company registration:
        </p>

        <div style="text-align: center;">
          <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
        </div>

        <div class="info-box">
          <strong>⏰ Important:</strong> This invitation will expire on <strong>${expirationDate}</strong>. 
          Please complete your registration before this time.
        </div>

        <p>
          Once you accept the invitation, you'll be able to:
        </p>

        <ul>
          <li>Set up your company profile</li>
          <li>Create and manage locations</li>
          <li>Track inventory and materials</li>
          <li>Manage jobs and projects</li>
          <li>Invite team members</li>
        </ul>

        <p>
          If you have any questions or need assistance, please don't hesitate to reach out to our support team.
        </p>

        <div class="link-fallback">
          <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
          <p>${inviteLink}</p>
        </div>

        <div class="footer">
          <p>
            This is an automated email from ResinWerks. Please do not reply to this email.
          </p>
          <p>
            © ${new Date().getFullYear()} ResinWerks. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

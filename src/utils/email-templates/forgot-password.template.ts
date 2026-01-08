interface ForgotPasswordEmailParams {
    name: string;
    resetLink: string;
    expiresInMinutes: number;
}

export const forgotPasswordEmailTemplate = (params: ForgotPasswordEmailParams): string => {
    const { name, resetLink, expiresInMinutes } = params;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - ResinWerks</title>
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
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
          text-align: center;
        }
        .security-note {
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          margin-top: 20px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔐 ResinWerks</div>
          <h1>Reset Your Password</h1>
        </div>
        
        <p>Hi ${name},</p>
        
        <p>
          We received a request to reset your password for your ResinWerks account. 
          Click the button below to create a new password:
        </p>
        
        <div style="text-align: center;">
          <a href="${resetLink}" class="cta-button">Reset Password</a>
        </div>
        
        <div class="info-box">
          <strong>⏱️ Important:</strong> This link will expire in ${expiresInMinutes} minutes for security reasons.
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
        
        <div class="security-note">
          <strong>🛡️ Security Notice</strong>
          <p style="margin: 10px 0 0 0; font-size: 14px;">
            If you didn't request this password reset, please ignore this email. 
            Your password will remain unchanged. For security concerns, contact our support team.
          </p>
        </div>
        
        <div class="footer">
          <p>Best regards,<br>The ResinWerks Team</p>
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

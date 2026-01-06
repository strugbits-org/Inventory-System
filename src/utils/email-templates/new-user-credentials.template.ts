interface NewUserCredentialsEmailParams {
    name: string;
    companyName: string;
    loginUrl: string;
    email: string;
    password: string;
}

export const newUserCredentialsEmailTemplate = (params: NewUserCredentialsEmailParams): string => {
    const { name, companyName, loginUrl, email, password } = params;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${companyName} on ResinWerks</title>
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
        .credentials-box {
          background-color: #f3f4f6;
          border-left: 4px solid #2563eb;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .credential-item {
          margin-bottom: 10px;
        }
        .credential-label {
          font-weight: bold;
          color: #4b5563;
          display: block;
          margin-bottom: 4px;
        }
        .credential-value {
          font-family: monospace;
          background-color: #ffffff;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          display: block;
          color: #1f2937;
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
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏗️ ResinWerks</div>
        </div>

        <h1>Welcome to ${companyName}!</h1>

        <p>Hello ${name},</p>

        <p>
          An account has been created for you to join <strong>${companyName}</strong> on the ResinWerks platform.
        </p>

        <p>Here are your login credentials:</p>

        <div class="credentials-box">
          <div class="credential-item">
            <span class="credential-label">Email:</span>
            <span class="credential-value">${email}</span>
          </div>
          <div class="credential-item">
            <span class="credential-label">Temporary Password:</span>
            <span class="credential-value">${password}</span>
          </div>
        </div>

        <p>
          Please log in and change your password immediately.
        </p>

        <div style="text-align: center;">
          <a href="${loginUrl}" class="cta-button">Login to ResinWerks</a>
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

interface RestockItem {
  variantId: string;
  variantName: string;
  materialName: string;
  quantityNeeded: number;
  color?: string;
}

interface ManufacturerRestockEmailParams {
  message: string;
  items: RestockItem[];
}

export const manufacturerRestockEmailTemplate = (params: ManufacturerRestockEmailParams): string => {
  const { message, items } = params;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${item.materialName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${item.variantName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${item.color || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; text-align: right; font-weight: bold;">${item.quantityNeeded}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restock Request</title>
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
        .logo-img {
          max-width: 200px;
          height: auto;
        }
        h1 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
          display: inline-block;
        }
        p {
          color: #4b5563;
          margin-bottom: 15px;
          white-space: pre-wrap;
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #e5e7eb;
          color: #374151;
          font-weight: 600;
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
          <img width="80" src="https://portal.masterinstaller.pro/logo.png" alt="ResinWerks Logo" class="logo-img">
        </div>

        <h1>Restock Request</h1>

        <div style="margin-bottom: 30px;">
          <p>${message}</p>
        </div>

        <h3>Requested Items</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Variant</th>
              <th>Color</th>
              <th style="text-align: right;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="footer">
          <p>
            This is an automated restock request from the Resinwerks platform.
          </p>
          <p>
            © ${new Date().getFullYear()} Resinwerks. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

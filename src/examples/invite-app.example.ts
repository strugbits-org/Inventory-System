/**
 * Example usage of the Company Invite Module
 * This file demonstrates how to integrate and use the invite functionality
 */

import express from 'express';
import inviteRoutes from '../routes/v1/invites.routes.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', inviteRoutes);

// Error handling (must be registered last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Email configured: ${process.env.SMTP_USER ? 'Yes' : 'No'}`);
    console.log(`🔑 JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    console.log(`\n📝 Available endpoints:`);
    console.log(`   POST   /api/superadmin/company-invite`);
    console.log(`   GET    /api/superadmin/company-invites`);
    console.log(`   DELETE /api/superadmin/company-invite/:inviteId`);
    console.log(`   POST   /api/invite/verify`);
  });
}

export default app;

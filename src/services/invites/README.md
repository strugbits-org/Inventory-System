# Company Invite Module

## Overview
This module handles the company invitation flow, allowing superadmins to invite new companies to the ResinWerks platform.

## Features
- ✅ Email validation and uniqueness checking
- ✅ JWT-based invite tokens with 48-hour expiration
- ✅ Email delivery via Nodemailer (Gmail)
- ✅ Professional HTML email template
- ✅ Prevent duplicate invites
- ✅ Token verification endpoint
- ✅ Invite management (list, cancel)

## Architecture

### Token Strategy: JWT
We use **JWT (JSON Web Tokens)** instead of UUID for the following reasons:
1. **Self-contained**: Token includes all necessary data (inviteId, email, role, expiration)
2. **Stateless verification**: Can verify token without database lookup
3. **Built-in expiration**: JWT has native `exp` claim
4. **Tamper-proof**: Signed with secret key, cannot be modified
5. **Industry standard**: Well-tested and widely adopted

### Security Considerations
1. **Token Validity**: 48-hour expiration enforced at both JWT and database level
2. **Duplicate Prevention**: Checks for existing companies and pending invites
3. **Email Validation**: Regex validation for email format
4. **Signed Tokens**: JWT signed with secret key (must be strong in production)
5. **One-time Use**: Invite marked as accepted after use (future implementation)

## API Endpoints

### 1. Create Company Invite
**POST** `/superadmin/company-invite`

**Auth Required**: Superadmin (TODO: Add middleware)

**Request Body**:
```json
{
  "companyEmail": "company@example.com"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Company invite created and email sent successfully",
  "data": {
    "id": "uuid",
    "email": "company@example.com",
    "role": "COMPANY",
    "expiresAt": "2024-12-13T20:00:00.000Z",
    "createdAt": "2024-12-11T20:00:00.000Z",
    "emailSent": true
  }
}
```

**Error Responses**:
- `400`: Invalid email format
- `400`: Company with this email already exists
- `400`: Pending invite already exists for this email
- `500`: Server error

---

### 2. Get Pending Invites
**GET** `/superadmin/company-invites`

**Auth Required**: Superadmin (TODO: Add middleware)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "company@example.com",
      "role": "COMPANY",
      "expiresAt": "2024-12-13T20:00:00.000Z",
      "createdAt": "2024-12-11T20:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. Verify Invite Token
**POST** `/invite/verify`

**Auth Required**: None (public endpoint)

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "inviteId": "uuid",
    "email": "company@example.com",
    "role": "COMPANY",
    "expiresAt": "2024-12-13T20:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Invalid token
- `400`: Token has expired
- `400`: Invite not found
- `400`: Invite already accepted

---

### 4. Cancel Invite
**DELETE** `/superadmin/company-invite/:inviteId`

**Auth Required**: Superadmin (TODO: Add middleware)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Invite cancelled successfully"
}
```

**Error Responses**:
- `400`: Invite not found
- `400`: Cannot cancel an accepted invite

---

## Email Configuration

### Gmail Setup (Recommended)
1. Enable 2-Step Verification on your Google Account
2. Go to: [Google Account > Security > App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Copy the 16-character password
5. Add to `.env`:
```env
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"
```

### Email Template
The module includes a professional HTML email template with:
- Responsive design
- Clear call-to-action button
- Expiration warning
- Fallback link for email clients that don't support buttons
- Company branding

### Testing Email Configuration
```typescript
import { testEmailConfig } from './utils/email.util';

// Test if email is configured correctly
const isValid = await testEmailConfig();
console.log('Email config valid:', isValid);
```

---

## Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT Secret (MUST be strong in production)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Application
APP_URL="http://localhost:3000"
APP_NAME="ResinWerks"

# Email (Gmail)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-google-app-password"
```

---

## File Structure

```
src/
├── controllers/
│   └── invites/
│       └── invite.controller.ts       # HTTP request handlers
├── services/
│   └── invites/
│       └── invite.service.ts          # Business logic
├── routes/
│   └── invites.routes.ts              # Route definitions
├── middleware/
│   └── error.middleware.ts            # Error handling
└── utils/
    ├── email.util.ts                  # Email sending logic
    └── email-templates/
        └── company-invite.template.ts # HTML email template
```

---

## Usage Example

### 1. Register Routes in Main App
```typescript
// src/app.ts
import express from 'express';
import inviteRoutes from './routes/invites.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();

app.use(express.json());

// Register invite routes
app.use('/api', inviteRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

### 2. Send an Invite (via API)
```bash
curl -X POST http://localhost:3000/api/superadmin/company-invite \
  -H "Content-Type: application/json" \
  -d '{"companyEmail": "newcompany@example.com"}'
```

### 3. Verify Token (when company clicks link)
```bash
curl -X POST http://localhost:3000/api/invite/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

---

## Future Enhancements (Not in this module)

The following features are **NOT** implemented in this module:
- ❌ Company onboarding form
- ❌ Location creation
- ❌ Company admin user creation
- ❌ Superadmin authentication middleware
- ❌ Invite acceptance flow

These will be implemented in subsequent modules.

---

## Error Handling

All errors are handled by the centralized error middleware:
- Validation errors → 400 Bad Request
- Not found errors → 404 Not Found
- Server errors → 500 Internal Server Error
- Custom error messages for better UX

---

## Testing

### Manual Testing Checklist
- [ ] Create invite with valid email
- [ ] Try to create duplicate invite (should fail)
- [ ] Try to invite existing company email (should fail)
- [ ] Verify valid token
- [ ] Verify expired token (should fail)
- [ ] Verify invalid token (should fail)
- [ ] List pending invites
- [ ] Cancel pending invite
- [ ] Check email delivery

### Email Testing
Use a test email service like [Mailtrap](https://mailtrap.io/) for development:
```env
# For Mailtrap testing
EMAIL_HOST="smtp.mailtrap.io"
EMAIL_PORT=2525
EMAIL_USER="your-mailtrap-user"
EMAIL_PASSWORD="your-mailtrap-password"
```

---

## Troubleshooting

### Email not sending
1. Check `.env` has correct `EMAIL_USER` and `EMAIL_PASSWORD`
2. Verify Google App Password is correct (not regular password)
3. Check 2-Step Verification is enabled on Google Account
4. Run `testEmailConfig()` to verify connection

### Token verification fails
1. Check `JWT_SECRET` is set in `.env`
2. Verify token hasn't expired (48 hours)
3. Check token hasn't been tampered with

### Database errors
1. Run `npx prisma migrate dev` to ensure schema is up to date
2. Check `DATABASE_URL` is correct
3. Verify Prisma Client is generated: `npx prisma generate`

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "nodemailer": "^6.9.x",
    "joi": "^18.0.2",
    "@prisma/client": "^7.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/nodemailer": "^6.4.x"
  }
}
```

---

## Security Best Practices

1. **Never commit `.env`** - Always use `.env.example` for templates
2. **Use strong JWT_SECRET** - Minimum 32 characters, random
3. **HTTPS in production** - Never send tokens over HTTP
4. **Rate limiting** - Add rate limiting to prevent abuse
5. **Email validation** - Already implemented, validates format
6. **Token expiration** - 48 hours enforced
7. **One-time use** - Mark invites as accepted (implement in onboarding module)

---

## License
Internal use only - ResinWerks

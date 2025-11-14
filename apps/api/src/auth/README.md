# Authentication

## Current Status: Foundation Phase (Basic JWT)

This directory contains a **basic JWT authentication** implementation for the Foundation phase.

⚠️ **NOT PRODUCTION READY** - This is a placeholder implementation.

## Production Implementation (TODO)

Replace this with full NextAuth + Azure AD B2C integration:

1. Install NextAuth.js v5
2. Configure Azure AD B2C provider (see `artifacts/P4_middleware.ts`)
3. Implement role-based access control (RBAC)
4. Add kiosk mode auto-login
5. Implement re-authentication for sensitive actions

See `artifacts/P4_middleware.ts` for complete production implementation.

## Development Usage

For now, authentication is minimal:

```typescript
import { generateToken, verifyToken } from './jwt';

// Generate token (dev only)
const token = generateToken({
  id: 'user-id',
  email: 'admin@church.org',
  name: 'Admin User',
  role: 'Admin',
  tenantId: 'tenant-uuid',
  personId: 'person-uuid',
});

// Verify token
const payload = verifyToken(token);
```

## Migration Path

1. Foundation: Basic JWT (current)
2. Development: Add NextAuth.js with email provider
3. Testing: Add Azure AD B2C test tenant
4. Production: Full Azure AD B2C with custom policies

# Platform Admin Operations Guide

This document describes the platform administrator role system, operational procedures, and security requirements for the Elder-First Church Platform.

---

## Overview

The platform uses a two-tier role system:
1. **Tenant roles** (`admin`, `editor`, `submitter`, `viewer`, `kiosk`) - Scoped to a single tenant
2. **Platform roles** (`platform_admin`, `platform_support`) - Cross-tenant permissions

Platform roles are separate from tenant roles and grant privileged access for multi-tenant operations.

---

## Platform Roles

### platform_admin

**Description:** Full platform access with write permissions.

**Permissions:**
- Create new tenants
- View all tenants
- Update tenant configurations
- Access cross-tenant support tools
- Manage platform-wide settings

**Use Cases:**
- Onboarding a new church
- Platform configuration changes
- Emergency support access

### platform_support

**Description:** Read-only cross-tenant access for support.

**Permissions:**
- View tenant configurations
- Access diagnostic information
- Read-only support access to tenant data

**Use Cases:**
- Customer support inquiries
- Debugging tenant issues
- Generating reports

---

## Role Assignment Process

### Who Can Be Granted Platform Roles

Platform roles should only be granted to:
- Full-time Verdaio/Elder-First employees
- Verified contractors with signed agreements
- On-call support personnel during their rotation

### How Roles Are Assigned

**Platform roles are NEVER assigned through the application UI.**

Roles are assigned through:

1. **Database Script (Recommended)**
   ```sql
   -- Add platform_admin role to a user
   UPDATE person
   SET platform_role = 'platform_admin'
   WHERE email = 'admin@verdaio.com';
   ```

2. **JWT Token Claims (Production)**
   In production with Azure AD B2C, platform roles are added as custom claims:
   ```json
   {
     "userId": "...",
     "role": "admin",
     "tenantId": "...",
     "platformRole": "platform_admin"
   }
   ```

3. **Development Only**
   For local development, add users to the `devUsers` array in `apps/web/src/auth.ts`:
   ```typescript
   {
     id: 'platform-admin-1',
     email: 'platform@dev.com',
     name: 'Platform Admin',
     role: 'admin',
     platformRole: 'platform_admin',
     tenantId: DEV_TENANT_ID,
   }
   ```

### Role Revocation

Roles should be revoked:
- Immediately upon termination
- Within 24 hours of role change
- At the end of contractor engagement

**Revocation process:**
```sql
-- Remove platform role
UPDATE person
SET platform_role = NULL
WHERE email = 'former-admin@verdaio.com';
```

---

## Security Requirements

### Authentication Requirements

All platform administrators must:
- Use strong passwords (16+ characters)
- Enable MFA on their accounts (when using Azure AD B2C)
- Use unique credentials (not shared accounts)
- Access from secure, trusted devices

### Network Requirements

In production environments:
- Platform admin endpoints may be restricted by IP
- VPN access may be required for sensitive operations
- Geographic restrictions may apply

### Session Requirements

- Platform admin sessions should be shorter than standard sessions
- Sensitive operations should require re-authentication
- Sessions should not persist across browser restarts

---

## Audit & Logging

### What Is Logged

All platform role operations are logged with the following information:

```json
{
  "event": "PLATFORM_ADMIN_OPERATION",
  "userId": "admin-user-id",
  "platformRole": "platform_admin",
  "procedure": "tenants.create",
  "tenantContext": "none",
  "timestamp": "2025-12-02T10:30:00.000Z"
}
```

### Log Locations

- Application logs: `apps/api/logs/` (or stdout in containerized deployments)
- Azure Application Insights (when configured)
- Log Analytics workspace (when configured)

### Log Retention

- Platform admin operation logs should be retained for at least 90 days
- Logs should be immutable (append-only)
- Logs should be backed up to separate storage

### Monitoring Alerts

Set up alerts for:
- Multiple failed platform role access attempts
- Platform operations outside business hours
- Platform operations from new IP addresses
- Tenant creation spikes

---

## Current Platform Endpoints

The following endpoints use `platformAdminProcedure`:

| Router | Procedure | Description |
|--------|-----------|-------------|
| `tenants` | `create` | Create a new tenant |

(More endpoints may be added as the platform evolves)

---

## Operational Procedures

### Creating a New Tenant

1. **Verify request authenticity**
   - Confirm the church contact through independent channels
   - Verify billing/contract is in place

2. **Prepare tenant data**
   - Unique slug (lowercase, alphanumeric with hyphens)
   - Church name
   - Primary contact email
   - Timezone

3. **Execute tenant creation**
   ```typescript
   // Via tRPC client with platform_admin token
   await trpc.tenants.create.mutate({
     slug: 'first-baptist-anytown',
     name: 'First Baptist Church of Anytown',
     primaryEmail: 'pastor@firstbaptist.org',
     timezone: 'America/New_York',
     locale: 'en-US',
   });
   ```

4. **Verify creation**
   - Check tenant appears in database
   - Verify default songs were seeded
   - Send welcome email to primary contact

### Emergency Support Access

When platform_support or platform_admin access is needed for support:

1. **Document the reason**
   - Customer ticket number
   - Description of issue
   - Requester name

2. **Use time-limited access**
   - Access should be for specific troubleshooting
   - Log all actions taken
   - Exit as soon as issue is resolved

3. **Follow up**
   - Document resolution
   - Remove elevated access if temporary
   - Inform customer of actions taken (when appropriate)

---

## Incident Response

### Suspected Unauthorized Access

If you suspect platform role compromise:

1. **Immediately:**
   - Revoke the compromised account's platform role
   - Change the account password
   - Review recent platform admin operations in logs

2. **Within 1 hour:**
   - Notify security team
   - Preserve logs
   - Identify scope of potential exposure

3. **Within 24 hours:**
   - Complete incident report
   - Implement additional controls if needed
   - Notify affected parties if required

---

## Related Documentation

- [Security Baseline V1](./SECURITY-BASELINE-V1.md) - Section 4: Authorization
- [Security Review Summary](./SECURITY-REVIEW-SUMMARY.md) - Platform role implementation
- [tRPC Middleware](../apps/api/src/trpc.ts) - `platformAdminProcedure` implementation
- [Auth Types](../apps/api/src/auth/types.ts) - Role type definitions

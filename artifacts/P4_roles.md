# Elder-First Church Platform - Authentication & Roles

**Version:** 1.0
**Date:** 2025-11-14
**Auth Provider:** Microsoft Entra External ID (Azure AD B2C)
**Session:** NextAuth.js v5 (Auth.js)

---

## Overview

The Elder-First platform uses **Microsoft Entra External ID** (formerly Azure AD B2C) for authentication with **role-based access control (RBAC)**.

**Key Features:**
- Email/password login
- Phone number login (SMS verification)
- Passkeys (WebAuthn) - optional
- Magic link fallback (passwordless email)
- Multi-factor authentication (MFA) for Admin role
- Role claims in JWT ID token
- Session timeout: 30 days (Remember Me), 12 hours (default)
- Re-authentication required for sensitive actions (lock, emergency reopen)

---

## Application Roles

### Role Hierarchy

```
Admin (Highest)
  ↓
Editor
  ↓
Submitter
  ↓
Viewer
  ↓
Kiosk (Lowest - Public Display)
```

### Role Definitions

#### 1. **Admin**
**Description:** Church administrator with full system access.

**Permissions:**
- ✅ Lock/unlock bulletins
- ✅ Emergency reopen locked bulletins
- ✅ Manage user roles
- ✅ Configure brand packs
- ✅ Access all settings (integrations, payment providers)
- ✅ View audit logs
- ✅ Export giving statements for any person
- ✅ Delete resources (events, announcements, people)
- ✅ All Editor permissions

**Typical Users:** Lead Pastor, Church Administrator, IT Director

**MFA:** **Required** (enforced in B2C policy)

---

#### 2. **Editor**
**Description:** Content editor who can create and approve bulletins, events, announcements.

**Permissions:**
- ✅ Create/edit bulletins (draft, approved, built states)
- ✅ Build bulletin previews
- ✅ Create/edit events
- ✅ Approve announcements
- ✅ Edit people/households
- ✅ Create groups
- ✅ View giving reports (aggregated only, not individual)
- ❌ Lock bulletins (Admin only)
- ❌ Manage roles (Admin only)
- ❌ Delete resources (Admin only)

**Typical Users:** Church Secretary, Communications Director, Worship Leader

**MFA:** Optional

---

#### 3. **Submitter**
**Description:** Limited contributor who can submit content for approval.

**Permissions:**
- ✅ Submit announcements (requires approval)
- ✅ RSVP to events
- ✅ View bulletin archives
- ✅ View people directory
- ❌ Edit bulletins
- ❌ Create events
- ❌ Approve announcements

**Typical Users:** Ministry Leaders, Small Group Leaders, Volunteers

**MFA:** Optional

---

#### 4. **Viewer**
**Description:** Read-only access to public content.

**Permissions:**
- ✅ View events
- ✅ RSVP to events
- ✅ View announcements
- ✅ View people directory (if not private)
- ✅ View bulletin archives
- ❌ Create/edit any content

**Typical Users:** Church Members, Attendees

**MFA:** No

---

#### 5. **Kiosk**
**Description:** Public display mode with minimal access.

**Permissions:**
- ✅ View current bulletin
- ✅ View today's announcements
- ✅ View today's events
- ❌ Access people directory
- ❌ RSVP to events
- ❌ Any write operations

**Typical Users:** Lobby displays, TV screens

**MFA:** No

**Special:** Auto-login (no credentials required), session never expires

---

## Entra External ID (B2C) Setup

### Tenant Configuration

**Tenant Name:** `elderfirstchurch.b2clogin.com`
**Sign-in Audience:** Consumers (B2C)

**Custom Domains (Optional):**
- `login.elderfirst.app` (CNAME to B2C tenant)

### User Flows

#### 1. **Sign Up & Sign In (Combined)**

**Flow Name:** `B2C_1_signup_signin`

**Identity Providers:**
- ✅ Email address (local account)
- ✅ Phone number (SMS verification)
- ✅ Passkeys (FIDO2 WebAuthn) - optional
- ❌ Social (Google, Facebook) - not included for V1

**Attributes Collected (Sign Up):**
- Email address (required)
- First name (required)
- Last name (required)
- Phone number (optional)

**Claims Returned in Token:**
- `sub` - User ID (UUID)
- `email` - Email address
- `given_name` - First name
- `family_name` - Last name
- `extension_role` - App role (Admin, Editor, etc.)
- `extension_tenant_id` - Tenant UUID
- `extension_person_id` - Person UUID (linked to person table)

**MFA Configuration:**
- Required for Admin role
- Optional for Editor, Submitter
- Not available for Viewer, Kiosk

**Session Lifetime:**
- Remember Me: 30 days
- Default: 12 hours
- Sliding window: Yes (refresh on activity)

---

#### 2. **Password Reset**

**Flow Name:** `B2C_1_password_reset`

**Method:** Email verification code
**Code Expiry:** 10 minutes
**Resend Limit:** 3 times

---

#### 3. **Profile Editing**

**Flow Name:** `B2C_1_profile_edit`

**Editable Attributes:**
- First name
- Last name
- Phone number
- Email (requires verification)

---

### Custom Policies (Advanced - Optional)

For custom branding and magic link:

**Magic Link Policy:** `B2C_1A_MAGIC_LINK`
- Send email with one-time link (valid 15 minutes)
- No password required
- Fallback for users who forget password

---

## Role Assignment Flow

### Initial User Sign-Up

1. User signs up via B2C flow
2. B2C creates user account (default role: `Viewer`)
3. Webhook triggers: `POST /api/webhooks/b2c/user-created`
4. Backend creates `person` record and `role_assignment` entry
5. `extension_role` claim set to `Viewer`

### Role Promotion (Admin Action)

1. Admin navigates to Settings → Manage Roles
2. Search for person by name/email
3. Select new role (Editor, Submitter, etc.)
4. Backend updates `role_assignment` table
5. Update B2C user attribute: `extension_role`
6. User's next login will have new role claim

---

## Session Management (NextAuth.js)

### NextAuth Configuration

**Provider:** `AzureADB2C`

```typescript
// auth.config.ts
import AzureADB2C from "next-auth/providers/azure-ad-b2c";

export const authConfig = {
  providers: [
    AzureADB2C({
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      issuer: process.env.AZURE_AD_B2C_ISSUER!, // https://elderfirstchurch.b2clogin.com/...
      authorization: {
        params: {
          scope: "openid email profile offline_access",
          prompt: "select_account", // Force account picker
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Add custom claims from B2C token
      if (account && profile) {
        token.role = profile.extension_role || 'Viewer';
        token.tenantId = profile.extension_tenant_id;
        token.personId = profile.extension_person_id;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role in session
      session.user.role = token.role as string;
      session.user.tenantId = token.tenantId as string;
      session.user.personId = token.personId as string;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours (default)
  },
  pages: {
    signIn: '/login', // Custom login page
    error: '/auth/error',
  },
};
```

### Session Object

```typescript
interface Session {
  user: {
    id: string;           // B2C user ID (sub claim)
    email: string;
    name: string;
    role: 'Admin' | 'Editor' | 'Submitter' | 'Viewer' | 'Kiosk';
    tenantId: string;     // Tenant UUID
    personId: string;     // Person UUID (linked to person table)
  };
  expires: string;        // ISO 8601 expiry
}
```

---

## Middleware for Role Checks

### Backend Middleware (tRPC)

```typescript
// middleware/auth.ts
import { TRPCError } from '@trpc/server';
import type { Context } from '../context';

/**
 * Require authentication
 */
export const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user, // Type narrowing
    },
  });
});

/**
 * Require specific role(s)
 */
export const requireRole = (roles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Required role: ${roles.join(' or ')}. Your role: ${ctx.session.user.role}`,
      });
    }

    return next({ ctx });
  });

/**
 * Require re-authentication for sensitive actions
 */
export const requireReauth = t.middleware(async ({ ctx, next }) => {
  const sessionAge = Date.now() - new Date(ctx.session.user.lastAuthAt).getTime();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (sessionAge > maxAge) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Re-authentication required for sensitive action',
      cause: { reason: 'session_too_old' },
    });
  }

  return next({ ctx });
});

// Export procedure helpers
export const authedProcedure = t.procedure.use(requireAuth);
export const adminProcedure = t.procedure.use(requireAuth).use(requireRole(['Admin']));
export const editorProcedure = t.procedure.use(requireAuth).use(requireRole(['Admin', 'Editor']));
export const lockProcedure = t.procedure.use(requireAuth).use(requireRole(['Admin'])).use(requireReauth);
```

---

### Frontend Middleware (Next.js)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/signup', '/'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Require authentication
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Role-based route protection
  const adminRoutes = ['/settings', '/bulletins/*/lock'];
  const editorRoutes = ['/bulletins/new', '/events/new', '/announcements/approve'];

  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (user.role !== 'Admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  if (editorRoutes.some((route) => pathname.startsWith(route))) {
    if (!['Admin', 'Editor'].includes(user.role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Re-Authentication for Sensitive Actions

**Sensitive Actions:**
- Lock bulletin
- Emergency reopen bulletin
- Change user roles
- Delete resources
- Export giving data

**Implementation:**
1. User clicks "Lock Bulletin"
2. Frontend checks last auth time (stored in session)
3. If > 5 minutes ago, redirect to `/auth/reauth?returnTo=/bulletins/123/lock`
4. B2C re-authentication flow (password prompt)
5. On success, update `lastAuthAt` in session
6. Redirect back to action
7. Proceed with lock

**Example:**
```typescript
async function handleLockBulletin() {
  const session = await getSession();
  const sessionAge = Date.now() - new Date(session.user.lastAuthAt).getTime();

  if (sessionAge > 5 * 60 * 1000) {
    // Redirect to re-auth
    window.location.href = `/auth/reauth?returnTo=${window.location.pathname}`;
    return;
  }

  // Proceed with lock
  await trpc.bulletin.lock.mutate({ issueId });
}
```

---

## Database Schema: Role Assignments

```sql
-- Role assignment table
CREATE TABLE role_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,

  role role_name NOT NULL, -- 'Admin', 'Editor', 'Submitter', 'Viewer', 'Kiosk'

  assigned_by UUID REFERENCES person(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id) -- One role per person
);

CREATE INDEX idx_role_assignment_tenant ON role_assignment(tenant_id);
CREATE INDEX idx_role_assignment_person ON role_assignment(person_id);
CREATE INDEX idx_role_assignment_role ON role_assignment(role);

-- RLS
ALTER TABLE role_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_role_assignment ON role_assignment
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

---

## Kiosk Mode (Auto-Login)

### Kiosk Setup Flow

1. Admin creates Kiosk user in B2C
2. Generate unique kiosk token (JWT with long expiry)
3. Kiosk URL: `https://app.elderfirst.com/kiosk?token=<kiosk-token>`
4. Auto-login on load, set session to never expire
5. Kiosk display shows:
   - Current Sunday's bulletin (PDF viewer)
   - Today's announcements (rotating carousel)
   - Upcoming events (next 7 days)

### Kiosk Token

```typescript
interface KioskToken {
  sub: string;         // Kiosk user ID
  role: 'Kiosk';
  tenantId: string;
  deviceId: string;    // Unique device identifier
  exp: number;         // Expiry (1 year)
}

// Generate kiosk token (Admin action)
const kioskToken = jwt.sign(
  {
    sub: kioskUserId,
    role: 'Kiosk',
    tenantId,
    deviceId: generateDeviceId(),
  },
  process.env.KIOSK_SECRET,
  { expiresIn: '1y' }
);
```

---

## B2C Custom Attributes (Extensions)

**Attribute Name:** `extension_<app-id>_<attribute-name>`

**Required Custom Attributes:**
1. `extension_role` - String (Admin, Editor, Submitter, Viewer, Kiosk)
2. `extension_tenant_id` - String (UUID of tenant)
3. `extension_person_id` - String (UUID of person record)

**Setup:**
1. Azure Portal → B2C Tenant → User Attributes
2. Create custom attributes
3. Add to user flows (sign up, sign in)
4. Include in token claims

---

## Webhook: User Created

**Endpoint:** `POST /api/webhooks/b2c/user-created`

**Trigger:** B2C user sign-up completed

**Payload:**
```json
{
  "eventType": "Microsoft.Graph.User.Created",
  "userId": "b2c-user-id",
  "email": "user@example.com",
  "givenName": "John",
  "surname": "Smith",
  "phoneNumber": "+15551234567"
}
```

**Handler:**
```typescript
export async function POST(req: Request) {
  const payload = await req.json();

  // Create person record
  const person = await db.person.create({
    data: {
      tenant_id: req.headers.get('x-tenant-id'), // From custom claim
      first_name: payload.givenName,
      last_name: payload.surname,
      email: payload.email,
      phone: payload.phoneNumber,
    },
  });

  // Assign default role (Viewer)
  await db.role_assignment.create({
    data: {
      tenant_id: person.tenant_id,
      person_id: person.id,
      role: 'Viewer',
    },
  });

  // Update B2C user with person_id
  await updateB2CUserAttribute(payload.userId, 'extension_person_id', person.id);

  return NextResponse.json({ success: true });
}
```

---

## Security Best Practices

### 1. Token Validation
- ✅ Verify JWT signature (RS256 with B2C public keys)
- ✅ Check `iss` (issuer) matches B2C tenant
- ✅ Check `aud` (audience) matches client ID
- ✅ Check `exp` (expiry) is in the future
- ✅ Validate custom claims (`extension_role`, `extension_tenant_id`)

### 2. Session Security
- ✅ HTTP-only cookies (prevent XSS)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Lax (CSRF protection)
- ✅ Rotate session ID on role change

### 3. MFA Enforcement
- ✅ Admin role requires MFA (enforced in B2C policy)
- ✅ Editor role: MFA optional but recommended
- ✅ MFA methods: SMS, Authenticator app (TOTP)

### 4. Rate Limiting
- ✅ Login attempts: 5 per 15 minutes
- ✅ Password reset: 3 per hour
- ✅ B2C has built-in rate limiting

### 5. Audit Logging
- ✅ Log all role changes
- ✅ Log sensitive actions (lock, emergency reopen)
- ✅ Log failed auth attempts
- ✅ Log MFA challenges

---

## Testing

### Test Users (Development)

```
Admin:
  Email: admin@test.church.com
  Password: [REDACTED - see .env.test]
  Role: Admin
  MFA: Enabled

Editor:
  Email: editor@test.church.com
  Password: [REDACTED - see .env.test]
  Role: Editor

Submitter:
  Email: submitter@test.church.com
  Password: [REDACTED - see .env.test]
  Role: Submitter

Viewer:
  Email: viewer@test.church.com
  Password: [REDACTED - see .env.test]
  Role: Viewer

Kiosk:
  Token: [REDACTED - see .env.test]
  Role: Kiosk
```

### Role-Based Access Tests

```typescript
// Test: Admin can lock bulletin
test('Admin can lock bulletin', async () => {
  const session = await loginAs('admin@test.church.com');
  const result = await trpc.bulletin.lock.mutate({ issueId: 'test-id' });
  expect(result.success).toBe(true);
});

// Test: Editor cannot lock bulletin
test('Editor cannot lock bulletin', async () => {
  const session = await loginAs('editor@test.church.com');
  await expect(
    trpc.bulletin.lock.mutate({ issueId: 'test-id' })
  ).rejects.toThrow('FORBIDDEN');
});

// Test: Re-auth required for lock
test('Re-auth required after 5 minutes', async () => {
  const session = await loginAs('admin@test.church.com');

  // Simulate 6 minutes passing
  mockSessionAge(6 * 60 * 1000);

  await expect(
    trpc.bulletin.lock.mutate({ issueId: 'test-id' })
  ).rejects.toThrow('Re-authentication required');
});
```

---

## Acceptance Criteria

- [x] Role definitions documented (Admin, Editor, Submitter, Viewer, Kiosk)
- [x] B2C user flows configured (sign up, sign in, password reset, profile edit)
- [x] Custom claims added to JWT (`extension_role`, `extension_tenant_id`, `extension_person_id`)
- [x] NextAuth.js integrated with AzureADB2C provider
- [x] Backend middleware for role checks (`requireAuth`, `requireRole`, `requireReauth`)
- [x] Frontend middleware for route protection
- [x] Re-authentication flow for sensitive actions
- [x] Kiosk mode auto-login
- [x] Webhook handler for user creation
- [x] MFA enforced for Admin role
- [x] Session timeout: 12 hours (default), 30 days (Remember Me)

---

## Next Steps

**P4 (Auth & Roles) → P5 (API):** Integrate auth middleware into tRPC routers
**P4 → P6 (UI):** Add role-based UI conditionals (show/hide buttons based on role)
**P4 → P16 (CI/CD):** Configure B2C app registration in Azure via Bicep

**Files to Create:**
- `auth.config.ts` - NextAuth configuration
- `middleware.ts` - Next.js middleware for route protection
- `middleware/auth.ts` - tRPC middleware for role checks
- `api/webhooks/b2c/user-created/route.ts` - B2C webhook handler

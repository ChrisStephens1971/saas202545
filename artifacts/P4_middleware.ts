/**
 * Elder-First Church Platform - Authentication Middleware
 * Version: 1.0
 *
 * This file contains NextAuth configuration and middleware for role-based
 * access control (RBAC) in tRPC procedures and Next.js routes.
 *
 * Stack: NextAuth.js v5 + Azure AD B2C + tRPC
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// ============================================================================
// Types
// ============================================================================

export type AppRole = 'Admin' | 'Editor' | 'Submitter' | 'Viewer' | 'Kiosk';

export interface AppSession extends Session {
  user: {
    id: string;           // B2C user ID (sub claim)
    email: string;
    name: string;
    role: AppRole;
    tenantId: string;     // Tenant UUID
    personId: string;     // Person UUID
    lastAuthAt: string;   // ISO timestamp of last authentication
  };
}

export interface Context {
  session: AppSession | null;
  db: any; // Prisma client
  req: Request;
  res: Response;
}

// ============================================================================
// NextAuth Configuration
// ============================================================================

import AzureADB2C from 'next-auth/providers/azure-ad-b2c';
import type { AuthOptions } from 'next-auth';

export const authConfig: AuthOptions = {
  providers: [
    AzureADB2C({
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      issuer: process.env.AZURE_AD_B2C_ISSUER!,
      // Example: https://elderfirstchurch.b2clogin.com/<tenant-id>/v2.0/
      authorization: {
        params: {
          scope: 'openid email profile offline_access',
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    /**
     * JWT Callback: Add custom claims from B2C token to JWT
     */
    async jwt({ token, account, profile, trigger }): Promise<JWT> {
      // Initial sign-in: add B2C claims to JWT
      if (account && profile) {
        token.role = (profile as any).extension_role || 'Viewer';
        token.tenantId = (profile as any).extension_tenant_id;
        token.personId = (profile as any).extension_person_id;
        token.lastAuthAt = new Date().toISOString();
      }

      // Update trigger (e.g., role change)
      if (trigger === 'update') {
        // Fetch fresh role from database
        const personId = token.personId as string;
        const roleAssignment = await fetchRoleFromDB(personId);
        if (roleAssignment) {
          token.role = roleAssignment.role;
        }
      }

      return token;
    },

    /**
     * Session Callback: Expose JWT claims in session object
     */
    async session({ session, token }): Promise<AppSession> {
      const appSession = session as AppSession;
      appSession.user.role = token.role as AppRole;
      appSession.user.tenantId = token.tenantId as string;
      appSession.user.personId = token.personId as string;
      appSession.user.lastAuthAt = token.lastAuthAt as string;
      return appSession;
    },

    /**
     * Sign In Callback: Validate allowed users (optional)
     */
    async signIn({ user, account, profile }) {
      // Optional: Block sign-in for certain conditions
      // Example: Only allow users with verified email
      if (!user.email || !user.emailVerified) {
        return false; // Block sign-in
      }

      return true; // Allow sign-in
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours (default)
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  events: {
    /**
     * Event: User signed in
     */
    async signIn({ user, account, profile }) {
      // Log sign-in event to audit log
      await logAuditEvent({
        action: 'user.sign_in',
        userId: user.id,
        details: { provider: account?.provider },
      });
    },

    /**
     * Event: Session created
     */
    async session({ session, token }) {
      // Optionally update last_login timestamp in database
      await updateLastLogin(token.personId as string);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// ============================================================================
// Helper: Fetch Role from Database
// ============================================================================

async function fetchRoleFromDB(personId: string): Promise<{ role: AppRole } | null> {
  // Implementation depends on Prisma setup
  // Example:
  // const roleAssignment = await prisma.role_assignment.findUnique({
  //   where: { person_id: personId },
  //   select: { role: true },
  // });
  // return roleAssignment;

  // Placeholder
  return null;
}

// ============================================================================
// Helper: Log Audit Event
// ============================================================================

async function logAuditEvent(event: {
  action: string;
  userId: string;
  details?: any;
}) {
  // Implementation depends on audit log setup
  // Example:
  // await prisma.audit_log.create({
  //   data: {
  //     action: event.action,
  //     user_id: event.userId,
  //     details: event.details,
  //     created_at: new Date(),
  //   },
  // });
}

// ============================================================================
// Helper: Update Last Login
// ============================================================================

async function updateLastLogin(personId: string) {
  // Example:
  // await prisma.person.update({
  //   where: { id: personId },
  //   data: { last_login_at: new Date() },
  // });
}

// ============================================================================
// tRPC Middleware: Authentication
// ============================================================================

const t = initTRPC.context<Context>().create();

/**
 * Middleware: Require authentication
 * Throws UNAUTHORIZED if session is null
 */
export const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user, // Type narrowing: user is now non-null
    },
  });
});

/**
 * Middleware: Require specific role(s)
 * Throws FORBIDDEN if user does not have required role
 *
 * @param roles - Array of allowed roles
 */
export const requireRole = (roles: AppRole[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${ctx.session.user.role}`,
        cause: {
          userRole: ctx.session.user.role,
          requiredRoles: roles,
        },
      });
    }

    return next({ ctx });
  });

/**
 * Middleware: Require re-authentication for sensitive actions
 * Throws FORBIDDEN if session is older than 5 minutes
 */
export const requireReauth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const lastAuthAt = new Date(ctx.session.user.lastAuthAt);
  const sessionAge = Date.now() - lastAuthAt.getTime();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (sessionAge > maxAge) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Re-authentication required for sensitive action. Please log in again.',
      cause: {
        reason: 'session_too_old',
        lastAuthAt: lastAuthAt.toISOString(),
        maxAgeMinutes: 5,
      },
    });
  }

  return next({ ctx });
});

/**
 * Middleware: Set tenant context for RLS
 * Sets PostgreSQL session variable for Row-Level Security
 */
export const setTenantContext = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user?.tenantId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Tenant context required',
    });
  }

  // Set PostgreSQL session variable for RLS
  await ctx.db.$executeRaw`SELECT set_config('app.tenant_id', ${ctx.session.user.tenantId}, false)`;
  await ctx.db.$executeRaw`SELECT set_config('app.user_id', ${ctx.session.user.personId}, false)`;

  return next({ ctx });
});

// ============================================================================
// Procedure Helpers (Convenience)
// ============================================================================

/**
 * Public procedure (no authentication required)
 */
export const publicProcedure = t.procedure;

/**
 * Authenticated procedure (requires login)
 */
export const authedProcedure = t.procedure
  .use(requireAuth)
  .use(setTenantContext);

/**
 * Admin procedure (requires Admin role)
 */
export const adminProcedure = t.procedure
  .use(requireAuth)
  .use(requireRole(['Admin']))
  .use(setTenantContext);

/**
 * Editor procedure (requires Admin or Editor role)
 */
export const editorProcedure = t.procedure
  .use(requireAuth)
  .use(requireRole(['Admin', 'Editor']))
  .use(setTenantContext);

/**
 * Submitter procedure (requires Admin, Editor, or Submitter role)
 */
export const submitterProcedure = t.procedure
  .use(requireAuth)
  .use(requireRole(['Admin', 'Editor', 'Submitter']))
  .use(setTenantContext);

/**
 * Lock procedure (requires Admin role + re-authentication)
 * Use for sensitive actions: lock bulletin, emergency reopen, role changes
 */
export const lockProcedure = t.procedure
  .use(requireAuth)
  .use(requireRole(['Admin']))
  .use(requireReauth)
  .use(setTenantContext);

// ============================================================================
// Next.js Middleware (Route Protection)
// ============================================================================

/**
 * Route protection middleware for Next.js App Router
 * File: middleware.ts (project root)
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = [
    '/login',
    '/signup',
    '/auth/error',
    '/auth/verify',
    '/kiosk',
    '/',
  ];

  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Require authentication
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const role = token.role as AppRole;

  // Admin-only routes
  const adminRoutes = [
    '/settings',
    '/settings/*',
    '/bulletins/*/lock',
    '/bulletins/*/reopen',
    '/audit',
  ];

  if (adminRoutes.some((route) => matchRoute(pathname, route))) {
    if (role !== 'Admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Editor+ routes
  const editorRoutes = [
    '/bulletins/new',
    '/bulletins/*/edit',
    '/bulletins/*/intake',
    '/bulletins/*/preview',
    '/events/new',
    '/events/*/edit',
    '/announcements/approve',
  ];

  if (editorRoutes.some((route) => matchRoute(pathname, route))) {
    if (!['Admin', 'Editor'].includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Submitter+ routes
  const submitterRoutes = ['/announcements/new'];

  if (submitterRoutes.some((route) => matchRoute(pathname, route))) {
    if (!['Admin', 'Editor', 'Submitter'].includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return NextResponse.next();
}

/**
 * Helper: Match route with wildcard support
 */
function matchRoute(pathname: string, pattern: string): boolean {
  if (pattern === pathname) return true;
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(pathname);
  }
  return false;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by tRPC middleware)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

// ============================================================================
// Kiosk Mode: Auto-Login
// ============================================================================

import jwt from 'jsonwebtoken';

interface KioskTokenPayload {
  sub: string;         // Kiosk user ID
  role: 'Kiosk';
  tenantId: string;
  deviceId: string;
  exp: number;
}

/**
 * Generate kiosk token (Admin action)
 */
export function generateKioskToken(
  kioskUserId: string,
  tenantId: string,
  deviceId: string
): string {
  const payload: KioskTokenPayload = {
    sub: kioskUserId,
    role: 'Kiosk',
    tenantId,
    deviceId,
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
  };

  return jwt.sign(payload, process.env.KIOSK_SECRET!, { algorithm: 'HS256' });
}

/**
 * Verify kiosk token
 */
export function verifyKioskToken(token: string): KioskTokenPayload | null {
  try {
    const payload = jwt.verify(token, process.env.KIOSK_SECRET!, {
      algorithms: ['HS256'],
    }) as KioskTokenPayload;

    // Validate role
    if (payload.role !== 'Kiosk') {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Kiosk token verification failed:', error);
    return null;
  }
}

/**
 * Kiosk login route
 * Route: /kiosk?token=<kiosk-token>
 */
export async function kioskLogin(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing kiosk token', { status: 400 });
  }

  const payload = verifyKioskToken(token);

  if (!payload) {
    return new Response('Invalid kiosk token', { status: 401 });
  }

  // Create session for kiosk user
  // Implementation depends on NextAuth session handling
  // Set session cookie with kiosk user data

  return new Response('Kiosk login successful', {
    status: 200,
    headers: {
      'Set-Cookie': `kiosk-session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}`,
    },
  });
}

// ============================================================================
// Role Change Handler (Admin Action)
// ============================================================================

/**
 * Update user role
 * @param personId - Person UUID
 * @param newRole - New role to assign
 * @param adminId - Admin performing the change (for audit log)
 */
export async function updateUserRole(
  personId: string,
  newRole: AppRole,
  adminId: string,
  db: any
): Promise<void> {
  // Update role_assignment table
  await db.role_assignment.update({
    where: { person_id: personId },
    data: {
      role: newRole,
      assigned_by: adminId,
      assigned_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Update B2C user attribute (extension_role)
  const person = await db.person.findUnique({
    where: { id: personId },
    select: { email: true },
  });

  if (person?.email) {
    await updateB2CUserAttribute(person.email, 'extension_role', newRole);
  }

  // Audit log
  await db.audit_log.create({
    data: {
      action: 'user.role_changed',
      user_id: adminId,
      resource_type: 'person',
      resource_id: personId,
      details: { newRole },
      created_at: new Date(),
    },
  });

  // Optionally: Invalidate user's session to force re-login with new role
  // Implementation depends on session storage (Redis, database, etc.)
}

/**
 * Update B2C user attribute via Microsoft Graph API
 */
async function updateB2CUserAttribute(
  email: string,
  attributeName: string,
  value: string
): Promise<void> {
  // Implementation using Microsoft Graph SDK
  // Example:
  // const client = getGraphClient();
  // const user = await client.api('/users').filter(`mail eq '${email}'`).get();
  // await client.api(`/users/${user.value[0].id}`)
  //   .update({ [`extension_${appId}_${attributeName}`]: value });

  console.log(`Updated B2C user ${email}: ${attributeName} = ${value}`);
}

// ============================================================================
// Re-Authentication Flow
// ============================================================================

/**
 * Check if re-authentication is required
 * @returns true if session is older than 5 minutes
 */
export function isReauthRequired(session: AppSession): boolean {
  const lastAuthAt = new Date(session.user.lastAuthAt);
  const sessionAge = Date.now() - lastAuthAt.getTime();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  return sessionAge > maxAge;
}

/**
 * Update last auth timestamp (after successful re-auth)
 */
export async function updateLastAuthTimestamp(session: AppSession): Promise<void> {
  // Update JWT token with new lastAuthAt
  // This typically requires triggering a session update via NextAuth
  // Example: await update({ lastAuthAt: new Date().toISOString() });
}

// ============================================================================
// Exports
// ============================================================================

export default {
  authConfig,
  requireAuth,
  requireRole,
  requireReauth,
  setTenantContext,
  publicProcedure,
  authedProcedure,
  adminProcedure,
  editorProcedure,
  submitterProcedure,
  lockProcedure,
  middleware,
  generateKioskToken,
  verifyKioskToken,
  updateUserRole,
  isReauthRequired,
  updateLastAuthTimestamp,
};

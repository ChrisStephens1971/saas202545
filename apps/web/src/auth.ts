import NextAuth, { DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADB2CProvider from 'next-auth/providers/azure-ad-b2c';
import crypto from 'crypto';
import { IS_DEV as IS_DEV_ENV, NODE_ENV } from './config/env';

// UI mode for dual-UI architecture (see docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md)
type UiMode = 'modern' | 'accessible';

// Extend session types to include userId, role, and uiMode
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
      tenantId?: string;
      uiMode: UiMode;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
    tenantId?: string;
    uiMode: UiMode;
  }
}

/**
 * SECURITY FIX (C2): Stricter development mode guard.
 *
 * Development credentials are ONLY enabled when ALL of these are true:
 * 1. NODE_ENV === 'development' (not just "not production")
 * 2. ALLOW_DEV_USERS === 'true' (explicit opt-in required)
 *
 * This prevents credential-based authentication from accidentally reaching
 * staging or production environments.
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (C2)
 */
const isStrictDevelopment = IS_DEV_ENV;
const allowDevUsers = process.env.ALLOW_DEV_USERS === 'true';
const isDev = isStrictDevelopment && allowDevUsers;

// Log warning if DEV_MODE or ALLOW_DEV_USERS is set but conditions aren't met
if (process.env.ALLOW_DEV_USERS === 'true' && !isStrictDevelopment) {
  console.error(
    '[SECURITY] ALLOW_DEV_USERS is set but NODE_ENV is not "development". ' +
    'Development credentials are DISABLED for security. ' +
    `Current NODE_ENV: ${NODE_ENV}`
  );
}

// Dev tenant ID must be a valid UUID for database operations
// Default to First Test Church tenant if not explicitly set
const DEV_TENANT_ID = process.env.DEV_TENANT_ID || '00000000-0000-0000-0000-000000000001';

/**
 * SECURITY FIX (C2): Development users with credentials from environment variables.
 *
 * Each dev user's password should be set via environment variable.
 * If not set, generate a random password at runtime (tokens invalid after restart).
 *
 * Environment variables:
 * - DEV_ADMIN_PASSWORD
 * - DEV_EDITOR_PASSWORD
 * - DEV_SUBMITTER_PASSWORD
 * - DEV_VIEWER_PASSWORD
 * - DEV_KIOSK_PASSWORD
 * - DEV_PASTOR_PASSWORD
 */
function getDevPassword(envVar: string, role: string): string {
  const password = process.env[envVar];
  if (password && password.length >= 8) {
    return password;
  }
  // Generate random password if not set - tokens will be invalid after restart
  const randomPassword = Math.random().toString(36).substring(2, 15) +
                         Math.random().toString(36).substring(2, 15);
  if (isDev) {
    console.warn(
      `[DEV AUTH] ${envVar} not set or too short. Using random password for ${role}. ` +
      `Set ${envVar} in .env.local for persistent dev credentials.`
    );
  }
  return randomPassword;
}

// SECURITY: Session duration configuration
// Default to 7 days, configurable via environment variable
const SESSION_MAX_AGE_DAYS = parseInt(process.env.SESSION_MAX_AGE_DAYS || '7', 10);
const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

/**
 * SECURITY FIX (H4): Constant-time string comparison for password checking.
 *
 * Using naive === for password comparison leaks timing information that
 * could help attackers determine how many characters match.
 *
 * This function uses crypto.timingSafeEqual to prevent timing attacks.
 * It first pads both strings to the same length to avoid early exit on length difference.
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (H4)
 */
function constantTimeCompare(a: string, b: string): boolean {
  // Convert to buffers
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // If lengths differ, we still need to do a comparison to avoid timing leaks
  // Pad the shorter buffer to match the longer one's length
  const maxLength = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(maxLength);
  const paddedB = Buffer.alloc(maxLength);

  bufA.copy(paddedA);
  bufB.copy(paddedB);

  // Use timingSafeEqual which runs in constant time
  // Also check lengths match (after padding, we need original length check)
  const lengthsMatch = bufA.length === bufB.length;
  const contentsMatch = crypto.timingSafeEqual(paddedA, paddedB);

  // Both conditions must be true
  return lengthsMatch && contentsMatch;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isDev
    ? [
        // Development mode: Simple credentials provider for testing
        CredentialsProvider({
          name: 'Development Credentials',
          credentials: {
            email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials) {
            /**
             * SECURITY FIX (C2): Development users with environment-based passwords.
             *
             * Passwords are loaded from environment variables for security.
             * If env vars are not set, random passwords are generated (see getDevPassword).
             *
             * To use dev credentials:
             * 1. Set NODE_ENV=development
             * 2. Set ALLOW_DEV_USERS=true
             * 3. Set password env vars in .env.local (e.g., DEV_ADMIN_PASSWORD=yourpassword)
             */
            const devUsers = [
              {
                id: 'dev-admin-1',
                email: 'admin@dev.com',
                name: 'Admin User',
                role: 'admin' as const,
                password: getDevPassword('DEV_ADMIN_PASSWORD', 'admin'),
                tenantId: DEV_TENANT_ID,
                uiMode: 'accessible' as UiMode, // Default to accessible
              },
              {
                id: 'dev-editor-1',
                email: 'editor@dev.com',
                name: 'Editor User',
                role: 'editor' as const,
                password: getDevPassword('DEV_EDITOR_PASSWORD', 'editor'),
                tenantId: DEV_TENANT_ID,
                uiMode: 'accessible' as UiMode,
              },
              {
                id: 'dev-submitter-1',
                email: 'submitter@dev.com',
                name: 'Submitter User',
                role: 'submitter' as const,
                password: getDevPassword('DEV_SUBMITTER_PASSWORD', 'submitter'),
                tenantId: DEV_TENANT_ID,
                uiMode: 'accessible' as UiMode,
              },
              {
                id: 'dev-viewer-1',
                email: 'viewer@dev.com',
                name: 'Viewer User',
                role: 'viewer' as const,
                password: getDevPassword('DEV_VIEWER_PASSWORD', 'viewer'),
                tenantId: DEV_TENANT_ID,
                uiMode: 'accessible' as UiMode,
              },
              {
                id: 'dev-kiosk-1',
                email: 'kiosk@dev.com',
                name: 'Kiosk User',
                role: 'kiosk' as const,
                password: getDevPassword('DEV_KIOSK_PASSWORD', 'kiosk'),
                tenantId: DEV_TENANT_ID,
                uiMode: 'accessible' as UiMode,
              },
              // FIRST PASTOR TEST USER
              // Maps to "First Test Church" seeded tenant (tenantId: '00000000-0000-0000-0000-000000000001')
              {
                id: 'pastor-test-1',
                email: 'pastor@testchurch.local',
                name: 'Pastor Test',
                role: 'admin' as const,
                password: getDevPassword('DEV_PASTOR_PASSWORD', 'pastor'),
                tenantId: '00000000-0000-0000-0000-000000000001', // Fixed UUID for 'firsttest' tenant
                uiMode: 'accessible' as UiMode,
              },
            ];

            // SECURITY FIX (H4): Use constant-time comparison for passwords
            // This prevents timing attacks that could reveal password characters
            const user = devUsers.find(
              (u) =>
                u.email === credentials.email &&
                constantTimeCompare(u.password, credentials.password as string)
            );

            if (user) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                uiMode: user.uiMode,
              };
            }

            return null;
          },
        }),
      ]
    : [
        // Production mode: Azure AD B2C
        AzureADB2CProvider({
          clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
          issuer: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW}/v2.0`,
        }),
      ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.uiMode = user.uiMode;
      }

      // Azure AD B2C token
      if (account && profile) {
        token.userId = profile.sub || profile.oid;
        // TODO: Map Azure AD B2C custom attribute to role
        // For now, default to viewer
        token.role = 'viewer';
        // TODO: Map tenant from Azure AD B2C or database
        token.tenantId = 'default-tenant';
        // Default uiMode for B2C users - accessible per elder-first design
        token.uiMode = 'accessible';
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
        session.user.tenantId = token.tenantId as string;
        session.user.uiMode = (token.uiMode as UiMode) || 'accessible';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    // SECURITY FIX: Reduced from 90 days to configurable default of 7 days
    // Shorter sessions reduce the window for stolen token attacks
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60, // Refresh session token daily
  },
});

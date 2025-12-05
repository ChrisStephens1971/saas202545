// Role types aligned with NextAuth (lowercase)
export type AppRole = 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';

// Platform-level roles for super admins/support
export type PlatformRole = 'platform_admin' | 'platform_support';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  tenantId: string;
  personId: string;
}

export interface AuthToken {
  userId: string;
  role: AppRole;
  tenantId: string;
  personId: string;
  platformRole?: PlatformRole;
  iat?: number;
  exp?: number;
}

// Role types aligned with NextAuth (lowercase)
export type AppRole = 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';

// Platform-level roles for super admins/support
export type PlatformRole = 'platform_admin' | 'platform_support';

// UI mode for dual-UI architecture (see docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md)
export type UiMode = 'modern' | 'accessible';
export const DEFAULT_UI_MODE: UiMode = 'accessible';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  tenantId: string;
  personId: string;
  uiMode: UiMode;
}

export interface AuthToken {
  userId: string;
  role: AppRole;
  tenantId: string;
  personId: string;
  uiMode: UiMode;
  platformRole?: PlatformRole;
  iat?: number;
  exp?: number;
}

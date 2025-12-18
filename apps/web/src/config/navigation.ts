/**
 * Navigation Configuration
 *
 * Shared navigation items used by SidebarNav component and tests.
 * Each item defines its route, label, icon, and visibility rules.
 */

import {
  LayoutDashboard,
  Newspaper,
  BookOpen,
  Users,
  Calendar,
  CalendarDays,
  Heart,
  MessageSquareHeart,
  DollarSign,
  Mail,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

export type UserRole = 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';

export interface RoleContext {
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  isSubmitter: () => boolean;
  isViewer: () => boolean;
  isKiosk: () => boolean;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Function to check if item should be visible.
   * Returns true if visible for the given role context.
   */
  isVisible: (context: RoleContext) => boolean;
}

/**
 * Main navigation items for authenticated non-kiosk users.
 * Order matters - items appear in the sidebar in this order.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/sunday-planner',
    label: 'Sunday Planner',
    icon: Calendar,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/bulletins',
    label: 'Bulletins',
    icon: Newspaper,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/sermons',
    label: 'Sermons',
    icon: BookOpen,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/people',
    label: 'People',
    icon: Users,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/events',
    label: 'Events',
    icon: CalendarDays,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/prayers',
    label: 'Prayers',
    icon: Heart,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/thank-yous',
    label: 'Thank-Yous',
    icon: MessageSquareHeart,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && ctx.isSubmitter(),
  },
  {
    href: '/donations',
    label: 'Donations',
    icon: DollarSign,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && ctx.isEditor(),
  },
  {
    href: '/communications',
    label: 'Communications',
    icon: Mail,
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && ctx.isEditor(),
  },
];

/**
 * Kiosk-specific navigation items.
 * Kiosk users only see these items, not the main nav items.
 */
export const KIOSK_NAV_ITEMS: NavItem[] = [
  {
    href: '/attendance',
    label: 'Attendance Check-In',
    icon: ClipboardCheck,
    isVisible: (ctx) => ctx.isAuthenticated && ctx.isKiosk(),
  },
];

/**
 * Helper to create a role context from a role and authentication state.
 * Used for testing and filtering nav items.
 */
export function createRoleContext(
  role: UserRole | null,
  isAuthenticated = true
): RoleContext {
  const hasRole = (checkRole: UserRole | UserRole[]) => {
    if (!role) return false;
    if (Array.isArray(checkRole)) {
      return checkRole.includes(role);
    }
    return role === checkRole;
  };

  return {
    isAuthenticated,
    role,
    isAdmin: () => hasRole('admin'),
    isEditor: () => hasRole(['admin', 'editor']),
    isSubmitter: () => hasRole(['admin', 'editor', 'submitter']),
    isViewer: () => hasRole(['admin', 'editor', 'submitter', 'viewer']),
    isKiosk: () => hasRole('kiosk'),
  };
}

/**
 * Get visible navigation items for a given role context.
 */
export function getVisibleNavItems(context: RoleContext): NavItem[] {
  if (context.isKiosk()) {
    return KIOSK_NAV_ITEMS.filter((item) => item.isVisible(context));
  }
  return NAV_ITEMS.filter((item) => item.isVisible(context));
}

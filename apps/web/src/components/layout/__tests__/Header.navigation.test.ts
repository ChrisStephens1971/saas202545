/**
 * Header Navigation Logic Tests
 *
 * Tests for navigation visibility based on user roles.
 * These tests verify:
 * - Navigation items visible to all authenticated users
 * - Role-gated navigation items (Thank-Yous, Donations, Communications)
 * - Kiosk user navigation restrictions
 */

import { describe, it, expect } from '@jest/globals';

// =============================================================================
// TYPE DEFINITIONS (matching useAuth hook)
// =============================================================================

type UserRole = 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';

interface NavItem {
  href: string;
  label: string;
  /**
   * Function to check if item should be visible.
   * Returns true if visible for the given role context.
   */
  isVisible: (context: RoleContext) => boolean;
}

interface RoleContext {
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  isSubmitter: () => boolean;
  isViewer: () => boolean;
  isKiosk: () => boolean;
}

// =============================================================================
// ROLE HELPER FUNCTIONS (matching useRole hook logic)
// =============================================================================

function createRoleContext(role: UserRole | null, isAuthenticated = true): RoleContext {
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

// =============================================================================
// NAVIGATION ITEMS (matching Header.tsx)
// =============================================================================

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/bulletins',
    label: 'Bulletins',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/sermons',
    label: 'Sermons',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/people',
    label: 'People',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/events',
    label: 'Events',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/prayers',
    label: 'Prayers',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk(),
  },
  {
    href: '/thank-yous',
    label: 'Thank-Yous',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && ctx.isSubmitter(),
  },
  {
    href: '/donations',
    label: 'Donations',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && (ctx.isAdmin() || ctx.isEditor()),
  },
  {
    href: '/communications',
    label: 'Communications',
    isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && (ctx.isAdmin() || ctx.isEditor()),
  },
];

const KIOSK_NAV_ITEMS: NavItem[] = [
  {
    href: '/attendance',
    label: 'Attendance Check-In',
    isVisible: (ctx) => ctx.isAuthenticated && ctx.isKiosk(),
  },
];

// Helper to get visible nav items for a role
function getVisibleNavItems(role: UserRole | null, isAuthenticated = true): string[] {
  const ctx = createRoleContext(role, isAuthenticated);
  return NAV_ITEMS.filter((item) => item.isVisible(ctx)).map((item) => item.label);
}

// =============================================================================
// TESTS: Navigation Item Configuration
// =============================================================================

describe('Header Navigation - Item Configuration', () => {
  it('has 9 total navigation items (excluding kiosk)', () => {
    expect(NAV_ITEMS).toHaveLength(9);
  });

  it('includes Sermons navigation item', () => {
    const sermonsItem = NAV_ITEMS.find((item) => item.href === '/sermons');
    expect(sermonsItem).toBeDefined();
    expect(sermonsItem?.label).toBe('Sermons');
  });

  it('includes Thank-Yous navigation item', () => {
    const thankYousItem = NAV_ITEMS.find((item) => item.href === '/thank-yous');
    expect(thankYousItem).toBeDefined();
    expect(thankYousItem?.label).toBe('Thank-Yous');
  });

  it('Sermons comes after Bulletins in nav order', () => {
    const bulletinsIndex = NAV_ITEMS.findIndex((item) => item.href === '/bulletins');
    const sermonsIndex = NAV_ITEMS.findIndex((item) => item.href === '/sermons');
    expect(sermonsIndex).toBe(bulletinsIndex + 1);
  });

  it('Thank-Yous comes after Prayers in nav order', () => {
    const prayersIndex = NAV_ITEMS.findIndex((item) => item.href === '/prayers');
    const thankYousIndex = NAV_ITEMS.findIndex((item) => item.href === '/thank-yous');
    expect(thankYousIndex).toBe(prayersIndex + 1);
  });
});

// =============================================================================
// TESTS: Admin Role Visibility
// =============================================================================

describe('Header Navigation - Admin Role', () => {
  const adminItems = getVisibleNavItems('admin');

  it('sees all 9 navigation items', () => {
    expect(adminItems).toHaveLength(9);
  });

  it('sees Sermons', () => {
    expect(adminItems).toContain('Sermons');
  });

  it('sees Thank-Yous', () => {
    expect(adminItems).toContain('Thank-Yous');
  });

  it('sees Donations', () => {
    expect(adminItems).toContain('Donations');
  });

  it('sees Communications', () => {
    expect(adminItems).toContain('Communications');
  });
});

// =============================================================================
// TESTS: Editor Role Visibility
// =============================================================================

describe('Header Navigation - Editor Role', () => {
  const editorItems = getVisibleNavItems('editor');

  it('sees all 9 navigation items', () => {
    expect(editorItems).toHaveLength(9);
  });

  it('sees Sermons', () => {
    expect(editorItems).toContain('Sermons');
  });

  it('sees Thank-Yous', () => {
    expect(editorItems).toContain('Thank-Yous');
  });

  it('sees Donations', () => {
    expect(editorItems).toContain('Donations');
  });

  it('sees Communications', () => {
    expect(editorItems).toContain('Communications');
  });
});

// =============================================================================
// TESTS: Submitter Role Visibility
// =============================================================================

describe('Header Navigation - Submitter Role', () => {
  const submitterItems = getVisibleNavItems('submitter');

  it('sees 7 navigation items (no Donations, Communications)', () => {
    expect(submitterItems).toHaveLength(7);
  });

  it('sees Sermons', () => {
    expect(submitterItems).toContain('Sermons');
  });

  it('sees Thank-Yous', () => {
    expect(submitterItems).toContain('Thank-Yous');
  });

  it('does NOT see Donations', () => {
    expect(submitterItems).not.toContain('Donations');
  });

  it('does NOT see Communications', () => {
    expect(submitterItems).not.toContain('Communications');
  });
});

// =============================================================================
// TESTS: Viewer Role Visibility
// =============================================================================

describe('Header Navigation - Viewer Role', () => {
  const viewerItems = getVisibleNavItems('viewer');

  it('sees 6 navigation items (no Thank-Yous, Donations, Communications)', () => {
    expect(viewerItems).toHaveLength(6);
  });

  it('sees Sermons', () => {
    expect(viewerItems).toContain('Sermons');
  });

  it('does NOT see Thank-Yous', () => {
    expect(viewerItems).not.toContain('Thank-Yous');
  });

  it('does NOT see Donations', () => {
    expect(viewerItems).not.toContain('Donations');
  });

  it('does NOT see Communications', () => {
    expect(viewerItems).not.toContain('Communications');
  });
});

// =============================================================================
// TESTS: Kiosk Role Visibility
// =============================================================================

describe('Header Navigation - Kiosk Role', () => {
  const kioskItems = getVisibleNavItems('kiosk');

  it('sees NO regular navigation items', () => {
    expect(kioskItems).toHaveLength(0);
  });

  it('does NOT see Sermons', () => {
    expect(kioskItems).not.toContain('Sermons');
  });

  it('does NOT see Thank-Yous', () => {
    expect(kioskItems).not.toContain('Thank-Yous');
  });

  it('has separate Attendance Check-In navigation', () => {
    const ctx = createRoleContext('kiosk');
    const kioskNavVisible = KIOSK_NAV_ITEMS.filter((item) => item.isVisible(ctx));
    expect(kioskNavVisible).toHaveLength(1);
    expect(kioskNavVisible[0].label).toBe('Attendance Check-In');
  });
});

// =============================================================================
// TESTS: Unauthenticated User
// =============================================================================

describe('Header Navigation - Unauthenticated User', () => {
  const unauthItems = getVisibleNavItems(null, false);

  it('sees NO navigation items', () => {
    expect(unauthItems).toHaveLength(0);
  });
});

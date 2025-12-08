/**
 * SidebarNav Navigation Logic Tests
 *
 * Tests for navigation visibility based on user roles.
 * These tests verify:
 * - Navigation items visible to all authenticated users
 * - Role-gated navigation items (Thank-Yous, Donations, Communications)
 * - Kiosk user navigation restrictions
 * - Active state logic
 *
 * NOTE: These tests use the shared NAV_ITEMS from @/config/navigation.ts.
 * When nav items are added/removed, update the counts below:
 *   - Total NAV_ITEMS: 10 (dashboard, sunday-planner, bulletins, sermons, people, events, prayers, thank-yous, donations, communications)
 *   - Admin/Editor: 10 (all items)
 *   - Submitter: 8 (excludes donations, communications)
 *   - Viewer: 7 (excludes thank-yous, donations, communications)
 *
 * Updated: 2025-12-08 - Added Sunday Planner nav item
 */

import { describe, it, expect } from '@jest/globals';
import {
  NAV_ITEMS,
  KIOSK_NAV_ITEMS,
  createRoleContext,
  getVisibleNavItems,
} from '@/config/navigation';
import type { UserRole } from '@/config/navigation';

// =============================================================================
// Helper function to get visible nav item labels for a role
// =============================================================================

function getVisibleNavLabels(
  role: UserRole | null,
  isAuthenticated = true
): string[] {
  const ctx = createRoleContext(role, isAuthenticated);
  return getVisibleNavItems(ctx).map((item) => item.label);
}

// =============================================================================
// TESTS: Navigation Item Configuration
// =============================================================================

describe('SidebarNav - Item Configuration', () => {
  it('has 10 total navigation items (excluding kiosk)', () => {
    expect(NAV_ITEMS).toHaveLength(10);
  });

  it('includes Sunday Planner navigation item', () => {
    const sundayPlannerItem = NAV_ITEMS.find((item) => item.href === '/sunday-planner');
    expect(sundayPlannerItem).toBeDefined();
    expect(sundayPlannerItem?.label).toBe('Sunday Planner');
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

  it('Sunday Planner comes after Dashboard in nav order', () => {
    const dashboardIndex = NAV_ITEMS.findIndex(
      (item) => item.href === '/dashboard'
    );
    const sundayPlannerIndex = NAV_ITEMS.findIndex((item) => item.href === '/sunday-planner');
    expect(sundayPlannerIndex).toBe(dashboardIndex + 1);
  });

  it('Sermons comes after Bulletins in nav order', () => {
    const bulletinsIndex = NAV_ITEMS.findIndex(
      (item) => item.href === '/bulletins'
    );
    const sermonsIndex = NAV_ITEMS.findIndex((item) => item.href === '/sermons');
    expect(sermonsIndex).toBe(bulletinsIndex + 1);
  });

  it('Thank-Yous comes after Prayers in nav order', () => {
    const prayersIndex = NAV_ITEMS.findIndex((item) => item.href === '/prayers');
    const thankYousIndex = NAV_ITEMS.findIndex(
      (item) => item.href === '/thank-yous'
    );
    expect(thankYousIndex).toBe(prayersIndex + 1);
  });

  it('all nav items have icons', () => {
    NAV_ITEMS.forEach((item) => {
      expect(item.icon).toBeDefined();
    });
    KIOSK_NAV_ITEMS.forEach((item) => {
      expect(item.icon).toBeDefined();
    });
  });
});

// =============================================================================
// TESTS: Admin Role Visibility
// =============================================================================

describe('SidebarNav - Admin Role', () => {
  const adminItems = getVisibleNavLabels('admin');

  it('sees all 10 navigation items', () => {
    expect(adminItems).toHaveLength(10);
  });

  it('sees Sunday Planner', () => {
    expect(adminItems).toContain('Sunday Planner');
  });

  it('sees Dashboard', () => {
    expect(adminItems).toContain('Dashboard');
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

describe('SidebarNav - Editor Role', () => {
  const editorItems = getVisibleNavLabels('editor');

  it('sees all 10 navigation items', () => {
    expect(editorItems).toHaveLength(10);
  });

  it('sees Sunday Planner', () => {
    expect(editorItems).toContain('Sunday Planner');
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

describe('SidebarNav - Submitter Role', () => {
  const submitterItems = getVisibleNavLabels('submitter');

  it('sees 8 navigation items (no Donations, Communications)', () => {
    expect(submitterItems).toHaveLength(8);
  });

  it('sees Sunday Planner', () => {
    expect(submitterItems).toContain('Sunday Planner');
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

describe('SidebarNav - Viewer Role', () => {
  const viewerItems = getVisibleNavLabels('viewer');

  it('sees 7 navigation items (no Thank-Yous, Donations, Communications)', () => {
    expect(viewerItems).toHaveLength(7);
  });

  it('sees Sunday Planner', () => {
    expect(viewerItems).toContain('Sunday Planner');
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

describe('SidebarNav - Kiosk Role', () => {
  const kioskItems = getVisibleNavLabels('kiosk');

  it('sees 1 navigation item (Attendance Check-In only)', () => {
    expect(kioskItems).toHaveLength(1);
  });

  it('sees Attendance Check-In', () => {
    expect(kioskItems).toContain('Attendance Check-In');
  });

  it('does NOT see Dashboard', () => {
    expect(kioskItems).not.toContain('Dashboard');
  });

  it('does NOT see Sermons', () => {
    expect(kioskItems).not.toContain('Sermons');
  });

  it('does NOT see Thank-Yous', () => {
    expect(kioskItems).not.toContain('Thank-Yous');
  });
});

// =============================================================================
// TESTS: Unauthenticated User
// =============================================================================

describe('SidebarNav - Unauthenticated User', () => {
  const unauthItems = getVisibleNavLabels(null, false);

  it('sees NO navigation items', () => {
    expect(unauthItems).toHaveLength(0);
  });
});

// =============================================================================
// TESTS: Role Context Helper
// =============================================================================

describe('createRoleContext', () => {
  it('creates admin context correctly', () => {
    const ctx = createRoleContext('admin');
    expect(ctx.isAdmin()).toBe(true);
    expect(ctx.isEditor()).toBe(true);
    expect(ctx.isSubmitter()).toBe(true);
    expect(ctx.isViewer()).toBe(true);
    expect(ctx.isKiosk()).toBe(false);
  });

  it('creates editor context correctly', () => {
    const ctx = createRoleContext('editor');
    expect(ctx.isAdmin()).toBe(false);
    expect(ctx.isEditor()).toBe(true);
    expect(ctx.isSubmitter()).toBe(true);
    expect(ctx.isViewer()).toBe(true);
    expect(ctx.isKiosk()).toBe(false);
  });

  it('creates submitter context correctly', () => {
    const ctx = createRoleContext('submitter');
    expect(ctx.isAdmin()).toBe(false);
    expect(ctx.isEditor()).toBe(false);
    expect(ctx.isSubmitter()).toBe(true);
    expect(ctx.isViewer()).toBe(true);
    expect(ctx.isKiosk()).toBe(false);
  });

  it('creates viewer context correctly', () => {
    const ctx = createRoleContext('viewer');
    expect(ctx.isAdmin()).toBe(false);
    expect(ctx.isEditor()).toBe(false);
    expect(ctx.isSubmitter()).toBe(false);
    expect(ctx.isViewer()).toBe(true);
    expect(ctx.isKiosk()).toBe(false);
  });

  it('creates kiosk context correctly', () => {
    const ctx = createRoleContext('kiosk');
    expect(ctx.isAdmin()).toBe(false);
    expect(ctx.isEditor()).toBe(false);
    expect(ctx.isSubmitter()).toBe(false);
    expect(ctx.isViewer()).toBe(false);
    expect(ctx.isKiosk()).toBe(true);
  });

  it('handles null role correctly', () => {
    const ctx = createRoleContext(null, false);
    expect(ctx.isAdmin()).toBe(false);
    expect(ctx.isEditor()).toBe(false);
    expect(ctx.isSubmitter()).toBe(false);
    expect(ctx.isViewer()).toBe(false);
    expect(ctx.isKiosk()).toBe(false);
  });
});

// =============================================================================
// TESTS: Active State Logic
// =============================================================================

describe('SidebarNav - Active State Logic', () => {
  /**
   * Simulates the isActive function from SidebarNav
   */
  const isActive = (href: string, pathname: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  describe('Dashboard', () => {
    it('is active on exact /dashboard path', () => {
      expect(isActive('/dashboard', '/dashboard')).toBe(true);
    });

    it('is NOT active on /dashboard/something', () => {
      expect(isActive('/dashboard', '/dashboard/settings')).toBe(false);
    });

    it('is NOT active on other paths', () => {
      expect(isActive('/dashboard', '/bulletins')).toBe(false);
    });
  });

  describe('Other routes (prefix matching)', () => {
    it('/sermons is active on exact path', () => {
      expect(isActive('/sermons', '/sermons')).toBe(true);
    });

    it('/sermons is active on nested path', () => {
      expect(isActive('/sermons', '/sermons/123')).toBe(true);
    });

    it('/sermons is NOT active on /sermons-other', () => {
      expect(isActive('/sermons', '/sermons-other')).toBe(false);
    });

    it('/bulletins is active on /bulletins/weekly', () => {
      expect(isActive('/bulletins', '/bulletins/weekly')).toBe(true);
    });

    it('/people is active on /people/123/edit', () => {
      expect(isActive('/people', '/people/123/edit')).toBe(true);
    });
  });
});

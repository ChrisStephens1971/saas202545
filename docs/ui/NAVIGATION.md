# App Navigation

This document describes the main application navigation structure, routes, and role-based access control.

## Overview

The Elder-First platform uses a **left-hand sidebar navigation** (`SidebarNav.tsx`) that displays different navigation items based on user authentication status and role.

### Layout Structure

The application uses a sidebar + main content layout:
- **Desktop (md+)**: Fixed 256px (w-64) sidebar on the left, main content fills remaining space
- **Mobile (<md)**: Fixed top header with hamburger menu, slide-in drawer navigation

### Key Components

- `SidebarNav.tsx` - Main sidebar navigation component
- `AppLayout.tsx` - Layout wrapper that conditionally shows sidebar
- `navigation.ts` - Shared navigation configuration (items, icons, visibility rules)

## Navigation Structure

### Standard Navigation (Authenticated, Non-Kiosk Users)

| Route | Label | Required Role | Description |
|-------|-------|---------------|-------------|
| `/dashboard` | Dashboard | Any authenticated | Main dashboard with overview widgets |
| `/bulletins` | Bulletins | Any authenticated | Weekly bulletin management |
| `/sermons` | Sermons | Any authenticated | Sermon archive and management |
| `/people` | People | Any authenticated | Member and visitor directory |
| `/events` | Events | Any authenticated | Church events and calendar |
| `/prayers` | Prayers | Any authenticated | Prayer requests and tracking |
| `/thank-yous` | Thank-Yous | Submitter+ | Thank-you note logging and history |
| `/donations` | Donations | Editor+ | Donation tracking and reporting |
| `/communications` | Communications | Editor+ | Email and messaging management |

### Kiosk Navigation

Kiosk users see a separate, restricted navigation:

| Route | Label | Description |
|-------|-------|-------------|
| `/attendance` | Attendance Check-In | Self-service attendance check-in |

## Role Hierarchy

The platform uses a hierarchical role system (highest to lowest):

1. **admin** - Full access to all features
2. **editor** - Access to most features except admin settings
3. **submitter** - Can submit content, limited administrative access
4. **viewer** - Read-only access to most features
5. **kiosk** - Special role for public kiosk terminals (attendance only)

### Role Helper Functions

The `useRole()` hook provides convenience functions:

```typescript
const { isAdmin, isEditor, isSubmitter, isViewer, isKiosk } = useRole();

// isAdmin() returns true only for 'admin'
// isEditor() returns true for 'admin' OR 'editor'
// isSubmitter() returns true for 'admin', 'editor', OR 'submitter'
// isViewer() returns true for 'admin', 'editor', 'submitter', OR 'viewer'
// isKiosk() returns true only for 'kiosk'
```

## Implementation

Navigation is implemented in:

- **Sidebar Component**: `apps/web/src/components/layout/SidebarNav.tsx`
- **Layout Component**: `apps/web/src/components/layout/AppLayout.tsx`
- **Navigation Config**: `apps/web/src/config/navigation.ts`
- **Auth Hook**: `apps/web/src/hooks/useAuth.ts`
- **Tests**: `apps/web/src/components/layout/__tests__/SidebarNav.test.ts`

### Navigation Configuration

Navigation items are defined in `src/config/navigation.ts`:

```typescript
import { NAV_ITEMS, KIOSK_NAV_ITEMS, createRoleContext, getVisibleNavItems } from '@/config/navigation';

// NAV_ITEMS contains all standard nav items with:
// - href: Route path
// - label: Display text
// - icon: Lucide icon component
// - isVisible: Function that returns true if item should be visible

// Example usage:
const ctx = createRoleContext('editor', true);
const visibleItems = getVisibleNavItems(ctx);
```

### Active State

Navigation items highlight when active using pathname matching:
- **Dashboard**: Exact match only (`/dashboard`)
- **Other routes**: Prefix match (`/sermons` matches `/sermons/123`)

## Adding New Navigation Items

When adding a new navigation item:

1. Add the item to `NAV_ITEMS` array in `src/config/navigation.ts`
2. Specify the icon (from lucide-react), href, label, and visibility function
3. Update tests in `SidebarNav.test.ts` to verify visibility for each role
4. Update this documentation

Example:

```typescript
{
  href: '/new-feature',
  label: 'New Feature',
  icon: SomeIcon, // from lucide-react
  isVisible: (ctx) => ctx.isAuthenticated && !ctx.isKiosk() && ctx.isEditor(),
}
```

## Mobile Navigation

The sidebar includes a mobile-responsive design:
- **Mobile header**: Fixed top bar with logo and hamburger menu button
- **Slide-in drawer**: Tapping hamburger opens a slide-in navigation drawer
- **Overlay**: Dark overlay behind drawer, tap to close
- **Auto-close**: Navigation closes automatically when a link is clicked

---

**Last Updated**: 2025-12-05

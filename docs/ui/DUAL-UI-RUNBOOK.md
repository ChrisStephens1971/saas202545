# Dual UI Runbook (UiMode: modern vs accessible)

**Version:** 1.0
**Date:** 2025-12-06
**Audience:** Developers, AI Coding Agents

---

## 1. Overview

The Elder-First Church Platform supports two UI modes to accommodate users with different needs:

| Mode | Target Audience | Description |
|------|-----------------|-------------|
| **accessible** | Seniors (65+), users with visual/motor impairments | Larger text (18px+), larger touch targets (48px), simpler layouts, higher contrast borders |
| **modern** | General users comfortable with dense UIs | Standard web density (16px text, 40px controls), more compact layouts |

**Why Two Modes?**

Small churches serve a wide demographic. Younger volunteers managing the platform prefer efficient, dense interfaces. Older members accessing bulletins or checking events benefit from larger, clearer UI elements. Rather than forcing one group to compromise, the system provides per-user preferences.

**Critical Constraint:** Both modes MUST remain compliant with `artifacts/P15_accessibility.md`. The "modern" mode is denser but may NOT regress below P15 accessibility baselines (e.g., no 12px fonts, no 32px buttons).

---

## 2. Architecture Summary

The dual-UI system flows through several layers:

```
Database (person.ui_mode)
    ↓
Session/Auth (apps/web/src/auth.ts extends JWT with uiMode)
    ↓
UiModeProvider (apps/web/src/components/providers/UiModeProvider.tsx)
    ↓
data-ui-mode attribute on <html> element
    ↓
CSS Variables (apps/web/src/styles/globals.css)
    ↓
Tailwind Utilities (apps/web/tailwind.config.ts)
    ↓
Components (Button, Input, AppShell, Dashboard, Bulletins)
```

### Key Files

| Layer | File Path | Purpose |
|-------|-----------|---------|
| **Types** | `packages/types/src/index.ts` | `UiMode` type exported for shared use |
| **Schema** | `packages/database/migrations/040_add_ui_mode_to_person.sql` | `ui_mode` column on `person` table |
| **Auth** | `apps/api/src/auth/types.ts` | User type includes `uiMode` |
| **Session** | `apps/web/src/auth.ts` | NextAuth session extended with `uiMode` |
| **Context** | `apps/web/src/ui/UiModeContext.tsx` | React context + `useUiMode()` hook |
| **Provider** | `apps/web/src/components/providers/UiModeProvider.tsx` | Wraps app, syncs mode to HTML attribute |
| **CSS Variables** | `apps/web/src/styles/globals.css` | `:root` and `[data-ui-mode="modern"]` rules |
| **Tailwind** | `apps/web/tailwind.config.ts` | Custom utilities like `min-h-touch`, `text-base` |
| **Primitives** | `apps/web/src/components/ui/Button.tsx`, `Input.tsx` | Use CSS variable-aware classes |
| **Shell (Modern)** | `apps/web/src/components/layout/appshell/AppShellModern.tsx` | Hamburger menu, `w-64` sidebar |
| **Shell (Accessible)** | `apps/web/src/components/layout/appshell/AppShellAccessible.tsx` | Always-visible nav, `w-72` sidebar |
| **Shell Switcher** | `apps/web/src/components/layout/appshell/AppShell.tsx` | Selects shell variant by mode |
| **Dashboard Container** | `apps/web/src/app/dashboard/_components/DashboardContainer.tsx` | Data fetching, view selection |
| **Dashboard Views** | `apps/web/src/app/dashboard/_components/DashboardModernView.tsx`, `DashboardAccessibleView.tsx` | Mode-specific presentation |
| **Bulletins Container** | `apps/web/src/app/bulletins/_components/BulletinsContainer.tsx` | Data fetching, filter state |
| **Bulletins Views** | `apps/web/src/app/bulletins/_components/BulletinsModernView.tsx`, `BulletinsAccessibleView.tsx` | Mode-specific presentation |

### CSS Variables (Design Contract)

```css
/* :root (default = accessible) */
--ef-font-body-size: 18px;       /* P15 baseline */
--ef-font-sm-size: 16px;
--ef-line-height-body: 1.5;
--ef-control-min-height: 48px;   /* P15 touch target */
--ef-control-padding-x: 1.5rem;
--ef-control-padding-y: 0.75rem;
--ef-spacing-comfortable: 1rem;
--ef-spacing-compact: 0.5rem;

/* [data-ui-mode="modern"] - denser but still P15 compliant */
--ef-font-body-size: 16px;
--ef-font-sm-size: 14px;
--ef-control-min-height: 40px;   /* Still meets minimum */
--ef-control-padding-x: 1rem;
--ef-control-padding-y: 0.5rem;
--ef-spacing-comfortable: 0.75rem;
--ef-spacing-compact: 0.375rem;
```

### Tailwind Classes That Respond to UiMode

| Class | Property | Accessible | Modern |
|-------|----------|------------|--------|
| `text-base` | font-size | 18px | 16px |
| `text-sm` | font-size | 16px | 14px |
| `min-h-touch` | min-height | 48px | 40px |
| `px-control-x` | padding-x | 1.5rem | 1rem |
| `py-control-y` | padding-y | 0.75rem | 0.5rem |
| `gap-comfortable` | gap | 1rem | 0.75rem |
| `gap-compact` | gap | 0.5rem | 0.375rem |

---

## 3. When to Use Dual Views vs Tokens Only

Most screens work well with **CSS variable tokens only**. The mode-aware utilities (`min-h-touch`, `text-base`, etc.) automatically scale components appropriately. Only screens that meet specific criteria should implement full dual-view architecture.

### Dual-View Eligibility Checklist

A screen qualifies for separate Modern/Accessible view components **only if ALL of these conditions are met**:

| Criterion | Description | Example |
|-----------|-------------|---------|
| **High-traffic for accessibility users** | Screen is frequently used by older adults or users with accessibility needs | Dashboard, Bulletins |
| **Material layout difference** | Accessible mode benefits from a fundamentally different layout, not just larger text | Single-column vs multi-column grid |
| **Information prioritization** | Accessible mode needs different content ordering or emphasis | Urgent items displayed first |
| **Interaction pattern change** | Touch/click targets or workflows differ significantly between modes | Stacked actions vs inline buttons |

If a screen does not meet ALL criteria, use **token-only scaling** instead.

### Dual-View Screens (Implemented)

| Screen | Justification | Location |
|--------|---------------|----------|
| **Dashboard** | Entry point; accessible needs linear "This Sunday" focus vs grid overview | `apps/web/src/app/dashboard/_components/` |
| **Bulletins** | Worship prep; accessible needs larger preview, "This Sunday" section, button filters | `apps/web/src/app/bulletins/_components/` |

### Future Dual-View Candidates

| Screen | Justification | Status |
|--------|---------------|--------|
| **People/Directory** | Frequently accessed; accessible benefits from linear list vs card grid | Candidate |
| **Events** | Calendar view is challenging for accessibility | Future |

### Token-Only Screens (Default)

These screens work well with CSS variable scaling alone:

| Screen | Reason |
|--------|--------|
| **Settings pages** | Simple forms - tokens provide adequate scaling |
| **Create/Edit forms** | Linear form flow works in both modes |
| **Sermon pages** | Linear content - tokens handle differences |
| **Login** | Simple form - token scaling sufficient |
| **Detail pages** | Single-item views - tokens sufficient |

---

## 4. Dual-View Screen Pattern

When a screen qualifies for dual views, implement the **Container + Dual View** pattern:

```
PageComponent (Next.js page)
  └── XxxContainer.tsx (data fetching, mode detection)
        ├── XxxModernView.tsx (presentation for 'modern' mode)
        └── XxxAccessibleView.tsx (presentation for 'accessible' mode)
```

### Responsibilities

| Component | Responsibilities | Does NOT Do |
|-----------|------------------|-------------|
| **Container** | Data fetching, state management, business logic, view selection via `useUiMode()` | Render UI details, layout decisions |
| **Views** | Pure presentation, receive typed ViewModel prop, mode-specific layout | Data fetching, business logic, state management |

### Example: Dashboard

**Files:**
- `apps/web/src/app/dashboard/_components/types.ts` - ViewModel types
- `apps/web/src/app/dashboard/_components/DashboardContainer.tsx` - Container
- `apps/web/src/app/dashboard/_components/DashboardModernView.tsx` - Modern layout
- `apps/web/src/app/dashboard/_components/DashboardAccessibleView.tsx` - Accessible layout

**ViewModel (types.ts):**
```typescript
export interface DashboardViewModel {
  bulletins: DashboardBulletin[];
  bulletinTotal: number;
  events: DashboardEvent[];
  eventTotal: number;
  people: DashboardPerson[];
  peopleTotal: number;
  announcements: DashboardAnnouncement[];
  isLoading: boolean;
}

export interface DashboardViewProps {
  viewModel: DashboardViewModel;
}
```

**Container (DashboardContainer.tsx):**
```typescript
import { useUiMode } from '@/ui/UiModeContext';
import { DashboardModernView } from './DashboardModernView';
import { DashboardAccessibleView } from './DashboardAccessibleView';

export function DashboardContainer() {
  const { mode } = useUiMode();

  // Data fetching
  const bulletins = trpc.bulletins.list.useQuery(...);
  // ... more queries

  const viewModel: DashboardViewModel = {
    bulletins: bulletins.data ?? [],
    // ... compose view model
    isLoading: bulletins.isLoading || ...,
  };

  // View selection based on mode
  return mode === 'modern'
    ? <DashboardModernView viewModel={viewModel} />
    : <DashboardAccessibleView viewModel={viewModel} />;
}
```

**Modern View (DashboardModernView.tsx):**
```typescript
export function DashboardModernView({ viewModel }: DashboardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Multi-column grid layout */}
    </div>
  );
}
```

**Accessible View (DashboardAccessibleView.tsx):**
```typescript
export function DashboardAccessibleView({ viewModel }: DashboardViewProps) {
  return (
    <div className="flex flex-col gap-comfortable">
      {/* Single-column linear layout, "This Sunday" first */}
    </div>
  );
}
```

### Example: Bulletins

**Files:**
- `apps/web/src/app/bulletins/_components/types.ts` - ViewModel + action types
- `apps/web/src/app/bulletins/_components/BulletinsContainer.tsx` - Container
- `apps/web/src/app/bulletins/_components/BulletinsModernView.tsx` - Grid + dropdown filter
- `apps/web/src/app/bulletins/_components/BulletinsAccessibleView.tsx` - Linear + button filters

**Key Differences:**

| Aspect | Modern | Accessible |
|--------|--------|------------|
| Layout | 3-column grid (desktop) | Single-column linear |
| Filter UI | Dropdown select | Large touch-friendly buttons |
| Filter options | 4 options (active, drafts, deleted, all) | 3 options (active, drafts, all) |
| "This Sunday" | Mixed with list | Dedicated section at top |
| Card size | Compact | Larger with more padding |

---

## 5. How to Add a New Dual-View Screen

Follow these steps to add a new screen with dual-view support:

### Step 1: Validate Eligibility

Before implementing, confirm the screen meets ALL criteria from Section 3:

- [ ] High-traffic for accessibility users
- [ ] Material layout difference needed
- [ ] Information prioritization differs between modes
- [ ] Interaction patterns change significantly

If criteria are not met, implement with token-only scaling instead.

### Step 2: Create Directory Structure

```bash
# Create _components directory for the page
mkdir -p apps/web/src/app/<screen>/_components
mkdir -p apps/web/src/app/<screen>/__tests__
```

### Step 3: Define ViewModel Types

Create `apps/web/src/app/<screen>/_components/types.ts`:

```typescript
/**
 * <Screen> View Model Types
 *
 * Shared types for the <Screen> container + dual view pattern.
 */

// Define data types needed for the view
export interface <Item>ListItem {
  id: string;
  // ... fields
}

// Define the view model
export interface <Screen>ViewModel {
  items: <Item>ListItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

// Define actions if views need callbacks
export interface <Screen>ViewActions {
  onItemClick?: (id: string) => void;
  // ... other callbacks
}

// Combined props for views
export interface <Screen>ViewProps {
  viewModel: <Screen>ViewModel;
  actions: <Screen>ViewActions;
}
```

### Step 4: Create Container Component

Create `apps/web/src/app/<screen>/_components/<Screen>Container.tsx`:

```typescript
'use client';

import { useUiMode } from '@/ui/UiModeContext';
import { <Screen>ModernView } from './<Screen>ModernView';
import { <Screen>AccessibleView } from './<Screen>AccessibleView';
import type { <Screen>ViewModel, <Screen>ViewActions } from './types';

export function <Screen>Container() {
  const { mode } = useUiMode();

  // Data fetching via tRPC
  // const data = trpc.<resource>.list.useQuery(...);

  // Compose view model
  const viewModel: <Screen>ViewModel = {
    items: /* data */,
    total: /* count */,
    isLoading: /* loading state */,
    error: /* error message */,
  };

  // Define actions
  const actions: <Screen>ViewActions = {
    onItemClick: (id) => { /* handle */ },
  };

  // Render view based on mode
  return mode === 'modern'
    ? <<Screen>ModernView viewModel={viewModel} actions={actions} />
    : <<Screen>AccessibleView viewModel={viewModel} actions={actions} />;
}
```

### Step 5: Create View Components

**Modern View** (`<Screen>ModernView.tsx`):
- Multi-column layouts where appropriate
- Compact spacing
- Dropdown filters, inline actions
- Standard touch targets (40px)

**Accessible View** (`<Screen>AccessibleView.tsx`):
- Single-column or simpler layouts
- Larger spacing (`gap-comfortable`)
- Button-based filters, stacked actions
- Larger touch targets (48px)
- Priority content first (e.g., "This Sunday" section)
- Always use `min-h-touch` on interactive elements

### Step 6: Update Page Component

Update `apps/web/src/app/<screen>/page.tsx`:

```typescript
import { <Screen>Container } from './_components/<Screen>Container';

export default function <Screen>Page() {
  return <<Screen>Container />;
}
```

### Step 7: Add Tests

Create `apps/web/src/app/<screen>/__tests__/<Screen>Views.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';

describe('<Screen> - ViewModel Type Contracts', () => {
  it('<Item> has required fields', () => {
    const item = { id: '1', /* ... */ };
    expect(item).toHaveProperty('id');
    // ... validate structure
  });
});

describe('<Screen> - View Selection Contract', () => {
  it('Container selects ModernView for mode=modern', () => {
    // Document the expected behavior
    const selectView = (mode: 'modern' | 'accessible') =>
      mode === 'modern' ? 'ModernView' : 'AccessibleView';
    expect(selectView('modern')).toBe('ModernView');
  });
});

describe('<Screen> - Accessible View Priority Rules', () => {
  // Test any content prioritization logic
});
```

### Step 8: Update Documentation

Update `docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md`:

1. Add the screen to the "Screens That Qualify for Dual Views" table
2. Mark status as "Implemented"
3. Add test file reference

---

## 6. P15 & UiMode Testing

The dual-UI system is validated by a comprehensive test suite that ensures both modes remain P15-compliant.

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `src/components/ui/__tests__/P15Compliance.test.ts` | 31 | Button/Input CSS utility compliance per mode |
| `src/components/layout/appshell/__tests__/AppShellModes.test.ts` | 50 | Shell mode-dependent rendering (sidebar width, nav visibility) |
| `src/__tests__/P15AccessibilityContract.test.ts` | 54 | P15 baseline requirements (font sizes, control heights, borders) |
| `src/app/dashboard/__tests__/DashboardViews.test.ts` | 20 | Dashboard ViewModel contracts, view selection |
| `src/app/bulletins/__tests__/BulletinsViews.test.ts` | 32 | Bulletins ViewModel contracts, "This Sunday" logic |

**Total P15/UiMode Tests:** ~185

### Running Tests

```bash
# Run all P15/accessibility tests
cd apps/web
npm run test:accessibility

# Run P15 contract tests only
npm run test:p15

# Run specific test file
npx jest src/__tests__/P15AccessibilityContract.test.ts
```

### What the Tests Verify

**1. Primitives (Button, Input):**
- Both modes use mode-responsive utilities (`min-h-touch`, `text-base`, etc.)
- No forbidden "tiny" classes (12px fonts, 32px heights)
- CSS variable padding applied consistently

**2. AppShell Modes:**
- Accessible: wider sidebar (`w-72`), `border-2`, always-visible navigation
- Modern: standard sidebar (`w-64`), `border`, hamburger menu on mobile
- Both modes: `min-h-touch` on all interactive elements

**3. Regression Guards:**
- Modern mode CANNOT go below: 16px fonts, 40px controls, 1px borders
- Accessible mode CANNOT go below: 18px fonts, 48px controls, 2px borders

**4. View Contracts:**
- ViewModel types have all required fields
- View selection logic correctly maps mode to view component
- Content prioritization rules (e.g., urgent announcements first in accessible)

### Interpreting Test Failures

| Failure Type | Meaning | Action |
|--------------|---------|--------|
| "forbidden tiny class" | Component uses a class below P15 minimum | Replace with mode-responsive utility |
| "min-h-touch missing" | Interactive element lacks touch target sizing | Add `min-h-touch` class |
| "accessible mode regressed" | Font/control/border below baseline | Restore to P15 minimum values |
| "ViewModel missing field" | Type contract violation | Add missing field to ViewModel |

**Allowed Adjustments:**
- You CAN adjust visual styling (colors, icons, layout)
- You CAN adjust spacing within mode-appropriate ranges
- You CANNOT drop below P15 baseline values for either mode

---

## 7. Guardrails & Anti-Patterns

### DO

- Use `useUiMode()` in containers to select views
- Share ViewModel types between Modern and Accessible views
- Use mode-responsive utilities (`min-h-touch`, `text-base`, `gap-comfortable`)
- Keep business logic in containers, presentation in views
- Test both modes with P15 compliance tests
- Prioritize important content in accessible view

### DO NOT

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Separate route trees (`/accessible/dashboard`) | Duplicates logic, hard to maintain | Single route, container selects view |
| Business logic in view components | Makes views hard to test, duplicates code | All logic in container |
| `text-xs`, `h-8`, `text-[12px]` in either mode | Below P15 minimum | Use `text-sm` (min 14px), `min-h-touch` |
| Hardcoded pixel values for fonts/spacing | Doesn't respond to mode | Use CSS variable-aware classes |
| Dropping modern mode below 16px/40px | P15 violation | Modern is denser but NOT inaccessible |
| Different ViewModel shapes per view | Type safety violation | Both views accept same ViewModel |

### Future Candidate Screens

These screens may be considered for dual-view in the future:

| Screen | Notes |
|--------|-------|
| **People/Directory** | Linear list vs card grid; high-traffic |
| **Events** | Calendar view challenging for accessibility |

When implementing, follow the pattern established by Dashboard and Bulletins.

---

## Quick Reference

### Check Current Mode in Components

```typescript
import { useUiMode } from '@/ui/UiModeContext';

function MyComponent() {
  const { mode, setMode, isPersisting } = useUiMode();
  // mode: 'modern' | 'accessible'
}
```

### Key Tailwind Classes

| Class | Use For |
|-------|---------|
| `min-h-touch` | All interactive elements (buttons, links, inputs) |
| `text-base` | Body text |
| `text-sm` | Secondary text (never for primary content) |
| `gap-comfortable` | Standard spacing between items |
| `gap-compact` | Tight spacing (use sparingly) |
| `px-control-x`, `py-control-y` | Button/input padding |

### P15 Baselines

| Metric | Accessible | Modern (Minimum) |
|--------|------------|------------------|
| Body font | 18px | 16px |
| Small font | 16px | 14px |
| Control height | 48px | 40px |
| Border width | 2px | 1px |

---

**See Also:**
- `artifacts/P15_accessibility.md` - Full P15 accessibility requirements
- `artifacts/P15_tests.md` - Test implementation specifications
- `docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md` - Implementation status and history

---

*Last Updated: 2025-12-06*

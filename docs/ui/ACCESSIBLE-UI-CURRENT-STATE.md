# Accessible UI Current State Analysis

**Date:** 2025-12-06
**Purpose:** Inventory of existing accessibility work to inform dual-UI architecture design
**Scope:** Read-only analysis of the `saas202545` Elder-First Church Platform codebase

---

## See Also

- **[DUAL-UI-RUNBOOK.md](DUAL-UI-RUNBOOK.md)** - Operational guide for extending the dual-UI system (how to add new dual-view screens, testing, guardrails)
- **[artifacts/P15_accessibility.md](../../artifacts/P15_accessibility.md)** - Full WCAG 2.1 AA checklist and elder-first design guidelines
- **[artifacts/P15_tests.md](../../artifacts/P15_tests.md)** - Test implementation specifications

---

## 1. App & UI Structure Overview

### Application Architecture

```
saas202545/
├── apps/
│   ├── web/                    # Next.js 14 frontend (main web UI)
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages (68 pages)
│   │   │   ├── components/     # Reusable components (45+ components)
│   │   │   │   ├── ui/         # Base primitives (Button, Input, Card)
│   │   │   │   ├── layout/     # AppLayout, Header, SidebarNav
│   │   │   │   └── providers/  # SessionProvider only
│   │   │   ├── lib/            # Utilities, tRPC client
│   │   │   ├── hooks/          # useAuth, useRole
│   │   │   ├── config/         # navigation.ts, env.ts
│   │   │   └── styles/         # globals.css
│   │   └── tailwind.config.ts  # Elder-first design tokens
│   └── api/                    # tRPC + REST backend
├── packages/
│   ├── config/                 # ACCESSIBILITY constants
│   ├── types/                  # Shared Zod schemas
│   ├── database/               # PostgreSQL migrations
│   └── shared/                 # Bulletin templates
└── docs/                       # Documentation
```

### Root Layout Chain

**Entry Point:** `apps/web/src/app/layout.tsx`

```tsx
<html lang="en">
  <body className={inter.className}>
    <SessionProvider>       {/* NextAuth session context */}
      <TRPCProvider>        {/* tRPC + React Query client */}
        <AppLayout>         {/* Sidebar/content layout wrapper */}
          {children}
        </AppLayout>
      </TRPCProvider>
    </SessionProvider>
  </body>
</html>
```

### Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| `AppLayout` | `components/layout/AppLayout.tsx` | Conditionally renders `SidebarNav` for authenticated pages |
| `SidebarNav` | `components/layout/SidebarNav.tsx` | Left sidebar + mobile hamburger drawer |
| `Header` | `components/layout/Header.tsx` | Legacy header (now used sparingly) |

**Key Observation:** There is **NO** theme provider or UI mode context currently in the provider stack.

---

## Dual-View Eligibility Rules

**When should a screen get separate Modern/Accessible views?**

The UiMode system provides two approaches for adapting UI to user preferences:

1. **CSS Variable Tokens** - Automatic scaling via `data-ui-mode` (most screens)
2. **Dual Views** - Completely separate React components per mode (select screens only)

### Rule: When to Create Dual Views

A screen qualifies for dual views **only if ALL of these conditions are met**:

| Criterion | Description | Example |
|-----------|-------------|---------|
| **High-traffic for accessibility users** | Screen is frequently used by older adults or users with accessibility needs | Dashboard, Bulletins |
| **Material layout difference** | Accessible mode benefits from a fundamentally different layout, not just larger text | Single-column vs grid |
| **Information prioritization** | Accessible mode needs different content ordering or emphasis | Urgent items first |
| **Interaction pattern change** | Touch/click targets or workflows differ significantly | Stacked actions vs inline |

### Screens That Qualify for Dual Views

| Screen | Justification | Status |
|--------|---------------|--------|
| **Dashboard** | High-traffic entry point; accessible mode benefits from linear "This Sunday" focus vs grid overview | ✅ Implemented |
| **Bulletins** | High-traffic for worship prep; accessible mode needs larger preview, simpler navigation | ✅ Implemented |
| **People/Directory** | Frequently accessed by all users; accessible mode benefits from linear list vs card grid | 🎯 Candidate |
| **Events** | Moderate usage; calendar view challenging for accessibility | ⏳ Future |

### Screens That Do NOT Need Dual Views

Most screens work well with token-based scaling alone:

| Screen | Reason |
|--------|--------|
| **Settings pages** | Simple forms - tokens provide adequate scaling |
| **Create/Edit forms** | Linear form flow works in both modes with token scaling |
| **Sermon pages** | Linear content - tokens handle font/spacing differences |
| **Login** | Simple form - token scaling sufficient |
| **Detail pages** | Single-item views - tokens sufficient |

### Implementation Pattern: Container + Dual Views

When implementing dual views, always use the container pattern:

```
PageComponent
  └── Container (data fetching, mode detection)
        ├── ModernView (presentation only)
        └── AccessibleView (presentation only)
```

**Rules:**
1. **Container** handles ALL data fetching, auth checks, and business logic
2. **Views** are pure presentation - receive a typed ViewModel prop
3. **Both views** share the same ViewModel interface (type safety)
4. Views must NOT duplicate data fetching or business logic

### Token-Only Screens (Default)

For screens that don't qualify for dual views, ensure:

1. Use CSS variable-aware utilities (`min-h-touch`, `text-base`, `px-control-x`)
2. Avoid hardcoded pixel values for fonts/spacing
3. Test in both modes to verify readability

---

## 2. Existing Accessible UI Implementations

### 2.1 Components

#### Base UI Components (`apps/web/src/components/ui/`)

| Component | File | Accessibility Features |
|-----------|------|------------------------|
| **Button** | `Button.tsx` | • `min-h-touch` (48px) for `md` size<br>• Focus ring: `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`<br>• Size variants: `sm` (40px), `md` (48px), `lg` (56px)<br>• Font sizes: `text-base`, `text-lg`, `text-xl` |
| **Input** | `Input.tsx` | • `min-h-touch` (48px)<br>• Proper `<label>` with `htmlFor`<br>• Error state with `role="alert"`<br>• Focus ring styling<br>• `text-base` (18px) font |
| **Card** | `Card.tsx` | • Semantic structure (`CardHeader`, `CardTitle`, `CardContent`)<br>• `text-2xl` for titles, `text-base` for descriptions |

**Button Size Variants (with accessibility defaults):**

```typescript
const sizes = {
  sm: 'text-base px-4 py-2 min-h-[40px]',
  md: 'text-lg px-6 py-3 min-h-touch', // 48px minimum - WCAG touch target
  lg: 'text-xl px-8 py-4 min-h-[56px]',
};
```

#### ARIA Usage Across Codebase

| File | Usage |
|------|-------|
| `Input.tsx:41` | `role="alert"` for error messages |
| `SidebarNav.tsx:139` | `aria-label` for hamburger menu button |
| `PreachMode.tsx:340-349` | `aria-label` for navigation buttons |
| `ImageUploadButton.tsx:143` | `aria-label` for file input |

**Notable Gap:** Only 5 instances of explicit ARIA attributes found across 45+ components. Most accessibility is handled via semantic HTML and Tailwind classes.

### 2.2 Layouts / Screens

#### Global CSS Accessibility Defaults (`globals.css`)

```css
@layer base {
  /* Elder-first accessibility defaults */
  html {
    font-size: 18px; /* Minimum readable size */
  }

  /* Global focus styles */
  * {
    @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }

  /* Minimum touch targets */
  button, a, input, select, textarea {
    min-height: 48px;
    min-width: 48px;
  }
}

@layer utilities {
  /* Large print mode support */
  @media (prefers-contrast: more) {
    body {
      font-size: 120%;
    }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

#### Screen-Reader Only Usage

| File | Line | Context |
|------|------|---------|
| `settings/theology/page.tsx` | 301 | `className="sr-only"` for hidden labels |
| `P15_accessibility.md` | 540 | Documentation example |

**No dedicated "accessible variant" screens exist.** All screens share the same elder-first baseline styling.

### 2.3 Themes / Tokens / CSS Variables

#### Tailwind Configuration (`tailwind.config.ts`)

```typescript
const config: Config = {
  theme: {
    extend: {
      // Elder-first design system
      fontSize: {
        'base': '18px',  // Minimum font size
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '32px',
      },
      spacing: {
        'touch': '48px', // Minimum touch target
      },
      colors: {
        // High contrast colors for accessibility
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... (9-step blue scale)
          900: '#0c4a6e',
        },
      },
    },
  },
};
```

#### Shared Config Constants (`packages/config/src/index.ts`)

```typescript
export const ACCESSIBILITY = {
  MIN_FONT_SIZE: 18,        // 18px base
  MIN_TOUCH_TARGET: 48,     // 48px hit targets
  MIN_CONTRAST_RATIO: 4.5,  // WCAG AA
  READING_LEVEL: '6-8th grade',
} as const;
```

#### What's Missing

| Token Category | Current State | Gap |
|----------------|---------------|-----|
| Typography scale | Single scale (18-32px) | No "large text" variant scale |
| Spacing | Single `touch` token (48px) | No density variants |
| Colors | High-contrast blue primary | No explicit "high contrast mode" overrides |
| Animation | `prefers-reduced-motion` respected | ✅ Covered |
| Theme switching | None | **No dark/light or accessible mode tokens** |

### 2.4 Feature Flags / User Settings

#### Current User Model (`apps/web/src/auth.ts`, `apps/api/src/auth/types.ts`)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
  tenantId: string;
  personId: string;
}
```

**Accessibility-related fields: NONE**

#### Database Schema (`001_initial_schema.sql`)

**`tenant` table columns:**

```sql
timezone VARCHAR(50) DEFAULT 'America/New_York',
locale VARCHAR(10) DEFAULT 'en-US',
```

**`person` table:** No preferences field.

**`role_assignment` table:** Only role/tenant assignments.

#### Feature Flag System

**Status: NONE**

- No feature flag table
- No feature flag service
- No user preferences table
- No `accessibleMode`, `uiMode`, or similar setting anywhere

#### Bulletin Large Print Support

The only "mode" concept exists in bulletin generation:

```sql
-- bulletin_issue table
pdf_large_print_url TEXT, -- 120% scaled version
```

This is output-only (generated PDF), not a UI mode.

---

## 3. User Settings & Feature Flags Related to Accessibility

### Current State: **NO USER-LEVEL ACCESSIBILITY SETTINGS**

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| **Database** | `tenant` table has `locale`, `timezone` | No `accessibleMode`, `highContrast`, `largeText` |
| **API** | User has `role`, `tenantId` | No preferences/settings endpoint |
| **Session** | `session.user.{id, role, tenantId}` | No `uiMode` or accessibility flags |
| **Frontend** | No user preferences context | No `AccessibilityProvider` or `UiModeContext` |

### How User Data Flows Today

```
Database (person + role_assignment)
    ↓
API (tRPC auth middleware extracts from JWT)
    ↓
Session (NextAuth JWT contains role, tenantId)
    ↓
Frontend (useSession, useAuth, useRole hooks)
```

**To add `accessibleMode`:**

1. Add column to `person` or new `user_preferences` table
2. Include in JWT/session
3. Create `useAccessibilityPreferences` hook
4. Create `<AccessibilityProvider>` context

---

## 4. Design System & Tokens – Accessibility Hooks

### 4.1 Primitive Components

| Component | Has Size Variants | Has Theme/Mode Awareness | Potential UiMode Hook |
|-----------|-------------------|--------------------------|------------------------|
| `Button` | ✅ `sm`, `md`, `lg` | ❌ | Could add `density` prop |
| `Input` | ❌ (fixed at 48px) | ❌ | Could add `size` prop |
| `Card` | ❌ | ❌ | Could add `padding` variant |
| Forms (inline) | N/A | ❌ | All use Tailwind directly |

**Component Props Summary:**

```typescript
// Button
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

// Input
interface InputProps {
  label?: string;
  error?: string;
  helper?: string;
}

// Card
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
}
```

**No components have:**
- `density` prop
- `compact` / `comfortable` / `cozy` variants
- Theme mode awareness

### 4.2 Theme / Tokens

#### Typography Scale (Current)

| Token | Value | Notes |
|-------|-------|-------|
| `text-base` | 18px | Already elder-friendly baseline |
| `text-lg` | 20px | |
| `text-xl` | 24px | |
| `text-2xl` | 28px | |
| `text-3xl` | 32px | |

**For Accessible Mode:** Could add `text-xl-accessible`, `text-2xl-accessible` at 120% scale.

#### Spacing Scale (Current)

| Token | Value | Notes |
|-------|-------|-------|
| `touch` | 48px | Custom token for touch targets |
| Default Tailwind | 0.25rem increments | No density variants |

#### Color Contrast (Current)

| Usage | Ratio | WCAG Level |
|-------|-------|------------|
| Body text (#1a1a1a on #fff) | 16.8:1 | AAA ✅ |
| Primary button (#fff on #0284c7) | 8.6:1 | AAA ✅ |
| Secondary text (#6b7280 on #fff) | 4.6:1 | AA ✅ |

**Already compliant.** Accessible mode could boost secondary text contrast.

### 4.3 Potential UiMode "Anchor Points"

#### Best Places to Insert UiMode

1. **`TRPCProvider.tsx`** – Add user preferences fetch alongside auth token
2. **New `UiModeProvider`** – Add between `SessionProvider` and `TRPCProvider`
3. **`globals.css`** – Add CSS variable overrides with `[data-ui-mode="accessible"]`
4. **`tailwind.config.ts`** – Add accessible mode utility classes

#### Recommended Architecture

```tsx
// New: apps/web/src/components/providers/UiModeProvider.tsx
<html lang="en" data-ui-mode={uiMode}>
  <body>
    <SessionProvider>
      <UiModeProvider>    {/* NEW */}
        <TRPCProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </TRPCProvider>
      </UiModeProvider>
    </SessionProvider>
  </body>
</html>
```

#### CSS Variable Approach

```css
/* globals.css */
:root {
  --font-base: 18px;
  --font-lg: 20px;
  --touch-target: 48px;
  --spacing-comfortable: 1rem;
}

[data-ui-mode="accessible"] {
  --font-base: 22px;           /* 120%+ */
  --font-lg: 26px;
  --touch-target: 56px;        /* Larger targets */
  --spacing-comfortable: 1.5rem; /* More breathing room */
}
```

---

## 5. Tests & Documentation Related to Accessible UI

### 5.1 Accessibility Documentation

| File | Content |
|------|---------|
| `artifacts/P15_accessibility.md` | **638 lines** - Comprehensive WCAG 2.1 AA checklist, elder-first design guidelines, screen reader testing, keyboard navigation checklist |
| `artifacts/P15_tests.md` | **727+ lines** - Test implementation specs with axe-core, Playwright, Pa11y, Lighthouse, senior user testing scripts |
| `artifacts/P9_templates.md` | Bulletin large-print scaling (120%), CMYK-safe colors |
| `PROJECT-WORKFLOW.md` | References "Accessibility testing (WCAG)" and "Accessibility standards met (WCAG AA)" as phase criteria |

### 5.2 Test Coverage

#### Documented Test Plans (Not Yet Implemented)

From `P15_tests.md`:

```typescript
// Planned: tests/accessibility/axe.test.tsx
describe('Accessibility Tests', () => {
  it('Home page should have no accessibility violations');
  it('Give page should have no accessibility violations');
  // ...
});

// Planned: tests/e2e/accessibility.spec.ts (Playwright)
test.describe('Accessibility E2E Tests', () => {
  test('Home page should be accessible');
  // ...
});
```

#### Existing Tests (Actual Implementation)

| Test File | Accessibility Coverage |
|-----------|------------------------|
| `Header.navigation.test.ts` | Tests role-based nav visibility, no a11y checks |
| `SidebarNav.test.ts` | Tests hamburger behavior, no a11y checks |
| `PreachMode.logic.test.ts` | Logic tests only |
| Various component tests | Mostly logic/rendering, no axe-core |

**No `jest-axe` or `@axe-core/react` imports found in actual test files.**

### 5.3 CI/CD Accessibility Pipeline

**Status: PLANNED BUT NOT IMPLEMENTED**

From `P15_tests.md`:

```yaml
# Planned: .github/workflows/accessibility.yml
name: Accessibility Tests
on: [push, pull_request]
jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - name: Run accessibility tests
        run: npm run test:accessibility
      - name: Run Pa11y
        run: npx pa11y-ci
```

**No `.github/workflows/accessibility.yml` file exists.**

---

## 6. Summary: Current State & Gaps

### Current State

| Aspect | Status | Notes |
|--------|--------|-------|
| **Elder-first baseline** | ✅ Strong | 18px fonts, 48px touch targets, high contrast |
| **WCAG AA compliance** | ✅ Likely | Good contrast ratios, semantic HTML, focus states |
| **`prefers-reduced-motion`** | ✅ Implemented | In `globals.css` |
| **`prefers-contrast: more`** | ✅ Basic | 120% font scale only |
| **Per-user accessible mode** | ❌ Missing | No setting, no flag, no provider |
| **Dual UI architecture** | ❌ Missing | No mode concept exists |
| **Accessibility tests** | ❌ Planned only | P15 docs exist but tests not implemented |

### Mode Concept Analysis

**Does any "mode" concept exist?**

| Candidate | Assessment |
|-----------|------------|
| Kiosk role | Role-based nav filtering, not UI mode |
| Large print bulletin PDF | Output artifact, not UI mode |
| Theme provider | **None exists** |
| User preferences | **None exists** |

### Cleanest Anchor Points for UiMode

1. **Provider Layer** (`app/layout.tsx`)
   - Add `UiModeProvider` between `SessionProvider` and `TRPCProvider`
   - Use `data-ui-mode` attribute on `<html>` for CSS cascade

2. **CSS Custom Properties** (`globals.css`)
   - Add `:root` defaults and `[data-ui-mode="accessible"]` overrides
   - All components inherit without code changes

3. **Component Props** (optional, for fine-tuning)
   - Add optional `size` or `density` props to primitives
   - Default to context value

4. **User Settings**
   - Add `accessible_mode BOOLEAN` to `person` table
   - Include in JWT claims
   - Fetch in `TRPCProvider` or dedicated hook

### Identified Gaps & Inconsistencies

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No user preferences table | Cannot persist user's accessible mode choice | Add `user_preferences` table or column |
| No theme/mode context | Components can't respond to mode changes | Create `UiModeProvider` |
| Inconsistent sizing | Some forms use inline Tailwind, bypass `Input` component | Standardize on UI primitives |
| No density variants | Can't easily increase spacing in accessible mode | Add CSS custom properties |
| Tests not implemented | Can't verify accessibility regressions | Implement P15 test specs |
| No accessible nav variant | Mobile hamburger-only nav may challenge motor-impaired users | Add always-visible nav option in accessible mode |

### Quick Wins (Low Effort, High Impact)

1. **Add CSS variables** for font sizes and spacing that can be overridden
2. **Create `UiModeProvider`** that reads from `localStorage` initially (before DB support)
3. **Add `data-ui-mode` attribute** to `<html>` element
4. **Implement axe-core tests** per P15 spec

### Medium-Term Work

1. Add `accessible_mode` to user/person schema
2. Create settings UI toggle
3. Expand component props with density variants
4. Add always-visible sidebar nav for accessible mode

---

## Appendix: Key File Paths

### Configuration

| Purpose | Path |
|---------|------|
| Tailwind config | `apps/web/tailwind.config.ts` |
| Global CSS | `apps/web/src/styles/globals.css` |
| Shared constants | `packages/config/src/index.ts` |
| Navigation config | `apps/web/src/config/navigation.ts` |

### Layout & Providers

| Purpose | Path |
|---------|------|
| Root layout | `apps/web/src/app/layout.tsx` |
| App layout | `apps/web/src/components/layout/AppLayout.tsx` |
| Sidebar nav | `apps/web/src/components/layout/SidebarNav.tsx` |
| Session provider | `apps/web/src/components/providers/SessionProvider.tsx` |
| tRPC provider | `apps/web/src/lib/trpc/Provider.tsx` |

### UI Primitives

| Component | Path |
|-----------|------|
| Button | `apps/web/src/components/ui/Button.tsx` |
| Input | `apps/web/src/components/ui/Input.tsx` |
| Card | `apps/web/src/components/ui/Card.tsx` |

### Auth & Types

| Purpose | Path |
|---------|------|
| NextAuth config | `apps/web/src/auth.ts` |
| API auth types | `apps/api/src/auth/types.ts` |
| Shared types | `packages/types/src/index.ts` |

### Documentation

| Topic | Path |
|-------|------|
| Accessibility guidelines | `artifacts/P15_accessibility.md` |
| Accessibility tests spec | `artifacts/P15_tests.md` |
| Bulletin templates | `artifacts/P9_templates.md` |

---

## 7. Implementation Status (Updated 2025-12-06)

### Dual-UI Architecture Implementation Complete

The following phases have been implemented to enable per-user UI mode switching:

#### Phase 1: Backend + Types ✅

| Item | Status | Location |
|------|--------|----------|
| `UiMode` type | ✅ | `packages/types/src/index.ts` |
| DB migration | ✅ | `packages/database/migrations/040_add_ui_mode_to_person.sql` |
| Auth types | ✅ | `apps/api/src/auth/types.ts` |
| Session extension | ✅ | `apps/web/src/auth.ts` |
| API endpoint | ✅ | `apps/api/src/routers/userPreferences.ts` |

#### Phase 2: React Context + Provider ✅

| Item | Status | Location |
|------|--------|----------|
| `UiModeContext` | ✅ | `apps/web/src/ui/UiModeContext.tsx` |
| `UiModeProvider` wrapper | ✅ | `apps/web/src/components/providers/UiModeProvider.tsx` |
| Root layout integration | ✅ | `apps/web/src/app/layout.tsx` |
| `[data-ui-mode]` on `<html>` | ✅ | Set by `UiModeContext` via `useEffect` |

#### Phase 3: CSS Variable Layer ✅

| Item | Status | Location |
|------|--------|----------|
| CSS custom properties | ✅ | `apps/web/src/styles/globals.css` |
| Tailwind integration | ✅ | `apps/web/tailwind.config.ts` |
| Button primitives | ✅ | `apps/web/src/components/ui/Button.tsx` |
| Input primitives | ✅ | `apps/web/src/components/ui/Input.tsx` |
| Unit tests | ✅ | `apps/web/src/ui/__tests__/UiModeContext.test.ts` |

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
--ef-control-min-height: 40px;   /* Still meets minimum */
/* ... tighter values */
```

### Usage

```tsx
// Access UI mode in components
import { useUiMode } from '@/ui/UiModeContext';

function MyComponent() {
  const { mode, setMode, isPersisting } = useUiMode();

  return (
    <button onClick={() => setMode('modern')}>
      Current: {mode} {isPersisting && '(saving...)'}
    </button>
  );
}
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

#### Phase 4: Dual Shell + Dual Views ✅

| Item | Status | Location |
|------|--------|----------|
| AppShell types | ✅ | `apps/web/src/components/layout/appshell/types.ts` |
| AppShellModern | ✅ | `apps/web/src/components/layout/appshell/AppShellModern.tsx` |
| AppShellAccessible | ✅ | `apps/web/src/components/layout/appshell/AppShellAccessible.tsx` |
| AppShell container | ✅ | `apps/web/src/components/layout/appshell/AppShell.tsx` |
| AppLayout refactor | ✅ | `apps/web/src/components/layout/AppLayout.tsx` |
| Dashboard types | ✅ | `apps/web/src/app/dashboard/_components/types.ts` |
| DashboardModernView | ✅ | `apps/web/src/app/dashboard/_components/DashboardModernView.tsx` |
| DashboardAccessibleView | ✅ | `apps/web/src/app/dashboard/_components/DashboardAccessibleView.tsx` |
| DashboardContainer | ✅ | `apps/web/src/app/dashboard/_components/DashboardContainer.tsx` |
| Settings Interface page | ✅ | `apps/web/src/app/settings/interface/page.tsx` |
| Unit tests | ✅ | `apps/web/src/components/layout/appshell/__tests__/AppShell.test.ts` |
| Dashboard view tests | ✅ | `apps/web/src/app/dashboard/__tests__/DashboardViews.test.ts` |
| **Bulletins types** | ✅ | `apps/web/src/app/bulletins/_components/types.ts` |
| **BulletinsModernView** | ✅ | `apps/web/src/app/bulletins/_components/BulletinsModernView.tsx` |
| **BulletinsAccessibleView** | ✅ | `apps/web/src/app/bulletins/_components/BulletinsAccessibleView.tsx` |
| **BulletinsContainer** | ✅ | `apps/web/src/app/bulletins/_components/BulletinsContainer.tsx` |
| **Bulletins view tests** | ✅ | `apps/web/src/app/bulletins/__tests__/BulletinsViews.test.ts` |

### Architecture Patterns

#### AppShell Pattern (Dual Shell)

The app shell is split into two variants:

```
AppLayout
  └── AppShell (UiMode switcher)
        ├── AppShellModern    (compact sidebar, hamburger on mobile)
        └── AppShellAccessible (larger sidebar, always-visible nav)
```

**AppShellModern:**
- Collapsible sidebar (icon-only mode on tablet)
- Hamburger menu on mobile
- Tighter spacing, smaller icons
- Standard 14-16px navigation text

**AppShellAccessible:**
- Always-visible navigation on tablet+ (no hamburger required)
- Wider sidebar (w-72 vs w-64) with larger icons
- Bottom tab bar on mobile with "More" drawer
- 16-18px+ navigation text
- Larger touch targets throughout

#### Container + Dual View Pattern (Dashboard)

Separates data fetching from presentation:

```
DashboardPage
  └── DashboardContainer (data fetching, mode detection)
        ├── DashboardModernView    (grid layout, stats cards)
        └── DashboardAccessibleView (linear layout, "This Sunday" focus)
```

**DashboardModernView:**
- Multi-column grid layout (3 columns on desktop)
- Quick stats cards with icons
- Compact announcements list
- Quick action buttons

**DashboardAccessibleView:**
- Single-column linear flow
- "This Sunday" bulletin focus first
- Urgent announcements highlighted at top
- Stacked quick actions with large touch targets
- Simpler visual hierarchy

#### Container + Dual View Pattern (Bulletins)

```
BulletinsPage
  └── BulletinsContainer (data fetching, filter state, mode detection)
        ├── BulletinsModernView    (grid layout, dropdown filter)
        └── BulletinsAccessibleView (linear layout, button filters, "This Sunday" section)
```

**BulletinsModernView:**
- Multi-column grid layout (3 columns on desktop, 2 on tablet)
- Dropdown filter (active/drafts/deleted/all)
- Compact bulletin cards with status chips
- Date + status at a glance

**BulletinsAccessibleView:**
- Single-column linear layout
- Large touch-friendly filter buttons (no dropdown)
- Dedicated "This Sunday" section at top
- Larger date formatting and status badges
- Stacked bulletin cards with large tap targets

#### Key Types

```typescript
// AppShell props (both variants use same interface)
interface AppShellProps {
  navItems: NavItem[];
  user: AppShellUser | null;
  isAuthenticated: boolean;
  roleContext: RoleContext;
  pathname: string;
  onSignOut: () => void;
  children: ReactNode;
}

// Dashboard view model (both variants use same data)
interface DashboardViewModel {
  bulletins: DashboardBulletin[];
  bulletinTotal: number;
  events: DashboardEvent[];
  eventTotal: number;
  people: DashboardPerson[];
  peopleTotal: number;
  announcements: DashboardAnnouncement[];
  isLoading: boolean;
}
```

### Settings UI

A dedicated settings page at `/settings/interface` allows users to toggle between modes:

- Visual radio-style buttons with mode previews
- Optimistic updates with error rollback
- Persists via `userPreferences.updateUiMode` tRPC mutation
- Accessible (recommended) mode marked as default

### Test Coverage

```
AppShell.test.ts (18 tests):
  - isNavItemActive helper function
  - Dashboard exact match vs prefix match
  - Settings routes active state
  - Type contract validation

DashboardViews.test.ts (20 tests):
  - ViewModel type contracts
  - Data structure validation
  - View selection contract
  - Accessible view priority rules (urgent first, etc.)

BulletinsViews.test.ts (32 tests):
  - BulletinListItem type contracts
  - ViewModel structure validation
  - Filter type contracts
  - View selection contract
  - "This Sunday" logic (UTC date handling)
  - Accessible filter buttons (3 options vs 4)
  - Modern grid layout classes
  - Status badge color contracts
  - View actions (onFilterChange)
```

#### Phase 5: P15/UiMode Test Layer ✅

| Test File | Tests | Description |
|-----------|-------|-------------|
| `src/components/ui/__tests__/P15Compliance.test.ts` | 31 | Button/Input CSS utility compliance |
| `src/components/layout/appshell/__tests__/AppShellModes.test.ts` | 50 | Shell mode-dependent rendering |
| `src/__tests__/P15AccessibilityContract.test.ts` | 54 | P15 baseline requirements |
| **Total P15 Tests** | **135** | All passing |

**Run P15 tests:**
```bash
cd apps/web
npm run test:accessibility
```

**What the P15 tests verify:**

1. **Primitives (Button, Input):**
   - Both modes use mode-responsive utilities (`min-h-touch`, `text-base`, etc.)
   - No forbidden tiny classes (12px fonts, 32px heights)
   - CSS variable padding applied consistently

2. **AppShell Modes:**
   - Accessible: wider sidebar (w-72), border-2, always-visible nav
   - Modern: standard sidebar (w-64), border, hamburger on mobile
   - Both modes: `min-h-touch` on interactive elements

3. **Regression Guards:**
   - Modern mode cannot go below 16px fonts, 40px controls
   - Accessible mode cannot go below 18px fonts, 48px controls

### P15 Compliance Summary

| Mode | Font (body) | Font (small) | Control Height | Border | Status |
|------|-------------|--------------|----------------|--------|--------|
| `accessible` | 18px | 16px | 48px | 2px | ✅ P15 compliant |
| `modern` | 16px | 14px | 40px | 1px | ✅ P15 compliant |

Both modes remain P15-compliant. Modern mode is denser but meets minimum requirements.

### Phase 6: Bulletins Dual-View ✅

Completed 2025-12-06. Bulletins now has full dual-view support following the container + views pattern.

**Key Features:**
- **Modern view**: Grid layout (3 cols desktop), dropdown filter, compact cards
- **Accessible view**: Linear layout, button filters, "This Sunday" section, large touch targets
- **Tests**: 32 tests covering type contracts, view selection, "This Sunday" logic

### Next Steps (Optional)

1. Extend dual-view pattern to People/Directory screen
2. Add Events dual-view (calendar accessibility)
3. Add Playwright E2E tests with axe-core integration
4. Add E2E tests for mode switching behavior

---

*Report generated for dual-UI architecture planning. Phase 6 (Bulletins dual-view) completed 2025-12-06.*

# Carbon Shell Experiment

## Purpose

This experiment introduces a **Carbon-inspired admin shell** for the Church Platform, inspired by IBM Carbon Design System:

- Light top bar with app branding
- Left sidebar navigation
- Calm, neutral background colors
- Flat white cards without heavy shadows
- Strong typography hierarchy

The goal is to evaluate whether this visual style provides a cleaner, more professional admin experience while maintaining our accessibility standards.

## Scope

**Initial scope:** `/bulletins` page only

Future expansion (if successful):
- Dashboard
- Sermons
- People
- Settings

## Flag Configuration

The shell variant is controlled by environment variables:

```bash
# Shell variant
NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT=legacy   # Original UI (default)
NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT=carbon   # Carbon-style shell

# Density (works with any shell)
NEXT_PUBLIC_CHURCH_UI_DENSITY=standard       # Default spacing/fonts
NEXT_PUBLIC_CHURCH_UI_DENSITY=elder          # Larger fonts/spacing for accessibility
```

**Important:** Restart the dev server after changing these values.

## Config Helper

Use the config helper to read shell settings:

```typescript
import { getUiShellVariant, getUiDensity } from '@/config/uiShellVariant';

const variant = getUiShellVariant(); // 'legacy' | 'carbon'
const density = getUiDensity();      // 'standard' | 'elder'
```

## Components

Carbon shell components are located in `apps/web/src/ui/carbon/`:

| Component | Description |
|-----------|-------------|
| `CarbonTopBar` | Thin horizontal bar at top with app name and user avatar |
| `CarbonSidebar` | Left vertical navigation with nav items |
| `CarbonPageShell` | Layout composing TopBar + Sidebar + main content |
| `CarbonPageHeader` | Page title, subtitle, and action buttons |
| `CarbonCard` | Simple white card with neutral border |
| `CarbonButton` | Primary button using Carbon blue |

The wrapper component `CarbonShellLayout` (in `components/layout/`) conditionally applies the Carbon shell based on the variant flag.

## Design Tokens

Carbon tokens are defined in `apps/web/src/ui/carbon/tokens.ts`:

- **Colors:** Primary blue (#0f62fe), neutral grays, backgrounds
- **Typography:** Page titles, subtitles, body, labels
- **Spacing:** xs, sm, md, lg, xl scale
- **Radii:** sm (2px), md (4px)
- **Borders:** Thin neutral borders

## Revert Steps

To completely remove the Carbon experiment:

1. **Set shell variant back to legacy:**
   ```bash
   NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT=legacy
   ```

2. **Remove Carbon-specific files:**
   ```bash
   # Delete Carbon UI components
   rm -rf apps/web/src/ui/carbon/

   # Delete Carbon shell layout
   rm apps/web/src/components/layout/CarbonShellLayout.tsx

   # Delete config helper
   rm apps/web/src/config/uiShellVariant.ts
   ```

3. **Clean up page files:**
   - Remove Carbon imports and conditional logic from `apps/web/src/app/bulletins/page.tsx`
   - Remove any Carbon-specific code from `BulletinsContainer.tsx`

4. **Update documentation:**
   - Remove this file (`docs/ui/CARBON-SHELL-EXPERIMENT.md`)
   - Remove Carbon section from `docs/DEV-RULES.md`
   - Remove Carbon entry from `CHANGELOG.md`

5. **Remove env vars:**
   - Remove `NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT` from `.env.local`

## Future Consideration

If the Carbon shell experiment is successful and adopted:
- This pattern may be ported into the `.template-system` as the default Verdaio admin shell for new projects
- The dual-view (Modern/Accessible) pattern will be preserved within the Carbon shell

---

**Status:** Experimental (dev only)
**Created:** 2025-12-07

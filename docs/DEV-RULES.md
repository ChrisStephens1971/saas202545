# Development Rules

This document defines mandatory rules for development on the Elder-First platform.

---

## Types and Enums

### Rule: Use Shared Types for Settings Values

All settings-related enums and constants **MUST** be imported from `@elder-first/types`. Do not define string arrays or literal types in UI components.

#### Theology Settings

Any form, dropdown, or validation for theology-related fields must use shared constants:

```typescript
// CORRECT - Use shared types
import {
  THEOLOGICAL_TRADITIONS,
  THEOLOGY_TRADITION_OPTIONS,
  TheologyTraditionSchema,
  BibleTranslationSchema,
  TheologySensitivitySchema,
  getCanonicalTradition,
  getTraditionDisplayLabel,
} from '@elder-first/types';

// WRONG - Hard-coded values
const traditions = ['Baptist', 'Presbyterian', 'Methodist']; // NO!
```

**See**: [Theology Settings Guide](settings/THEOLOGY-SETTINGS.md) for full implementation details.

#### Website Fields

```typescript
// CORRECT
import { WebsiteSchema } from '@elder-first/types';

// WRONG
const isValidUrl = (url: string) => ... // NO custom validation!
```

**See**: [Website Field Guide](settings/WEBSITE-FIELD-GUIDE.md)

---

### Rule: Canonical Values vs Display Labels

When a field has user-friendly labels that differ from stored values:

1. **Store**: Only canonical values go to the database/API
2. **Display**: Labels are UI-only, sourced from options arrays
3. **Convert**: Use helper functions for bidirectional mapping

```typescript
// UI State
const [formValue, setFormValue] = useState<TheologyTradition>('Presbyterian');
const [displayLabel, setDisplayLabel] = useState('Presbyterian (PCA)');

// Submit canonical value
api.save({ tradition: formValue });  // 'Presbyterian', not 'Presbyterian (PCA)'
```

---

### Rule: Adding New Enum Values

When adding a new value to a settings enum:

1. **Add to shared types first**: Edit `packages/types/src/index.ts`
2. **Update Zod schema**: Add to the relevant `z.enum([...])`
3. **Update options array**: Add `{ value, label }` if needed
4. **Run tests**: `cd packages/types && npm test`
5. **Update documentation**: Update the relevant guide in `docs/settings/`

**Never add values directly to UI components.**

---

## PostgreSQL Aggregates (COUNT, SUM, AVG)

When using PostgreSQL aggregate functions, use the serialization helpers:

```typescript
import { pgCountToNumber, pgDecimalToNumber } from '../lib/dbNumeric';

// CORRECT
total: pgCountToNumber(result.rows[0]?.total),
avgScore: pgDecimalToNumber(result.rows[0]?.avg),

// WRONG - Will cause TransformResultError
total: result.rows[0]?.total,  // Returns string "42", not number!
```

**See**: [Serialization Rules](backend/SERIALIZATION-RULES.md)

---

## Multi-Tenant Data Access

Always use `queryWithTenant()` for database queries:

```typescript
// CORRECT
const result = await queryWithTenant<Person>(
  tenantId,
  'SELECT * FROM person WHERE id = $1',
  [id]
);

// WRONG - Bypasses RLS
const result = await db.query('SELECT * FROM person WHERE id = $1', [id]);
```

---

## Security Rules

1. **Parameterized queries only** - Never interpolate user input into SQL
2. **Always validate input** - Use Zod schemas for all API inputs
3. **Never log secrets** - No passwords, tokens, or API keys in logs
4. **Use environment variables** - Never hard-code credentials

---

## Documentation Updates

When making changes that affect shared types or patterns:

1. Update the relevant doc in `docs/settings/` or `docs/backend/`
2. Add entry to `CHANGELOG.md` under `[Unreleased]`
3. Update related docs that link to the changed content

---

## Dual-UI (UiMode) Rules

The platform supports two UI modes: `accessible` (elder-first default) and `modern` (denser layout). Both modes MUST comply with P15 accessibility requirements.

### Key Rules

1. **No duplicate route trees** - Do NOT create separate `/accessible/...` routes. Use a single route with container + dual views.

2. **Use container + dual views** for screens that meet ALL eligibility criteria:
   - High-traffic for accessibility users
   - Material layout difference between modes
   - Different information prioritization
   - Different interaction patterns

3. **Both modes remain P15-compliant**:
   - Modern mode minimum: 16px fonts, 40px controls, 1px borders
   - Accessible mode minimum: 18px fonts, 48px controls, 2px borders

4. **Use mode-responsive utilities** - `min-h-touch`, `text-base`, `gap-comfortable` instead of hardcoded values.

5. **Business logic in containers only** - Views are pure presentation.

### Current Dual-View Screens

- Dashboard (`apps/web/src/app/dashboard/_components/`)
- Bulletins (`apps/web/src/app/bulletins/_components/`)

**See**: [DUAL-UI-RUNBOOK.md](ui/DUAL-UI-RUNBOOK.md) for complete implementation guide.

---

## UI Shell Experiments (Carbon Shell)

The platform supports experimental UI shell variants controlled by environment variables.

### Configuration

```typescript
import { getUiShellVariant, getUiDensity } from '@/config/uiShellVariant';

const variant = getUiShellVariant(); // 'legacy' | 'carbon'
const density = getUiDensity();      // 'standard' | 'elder'
```

Environment variables:
- `NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT`: `legacy` (default) or `carbon`
- `NEXT_PUBLIC_CHURCH_UI_DENSITY`: `standard` (default) or `elder`

### Key Rules

1. **Legacy layout must not be removed** while any shell experiment is active.

2. **No page should depend solely on the experimental shell** - every page must work correctly when `variant === 'legacy'`.

3. **Use the config helper** - do not read env vars directly for shell configuration.

4. **Carbon components are isolated** - Carbon UI components live in `apps/web/src/ui/carbon/` and should not be imported into legacy code paths.

### Current Shell Experiments

- **Carbon Shell** (`carbon`): IBM Carbon-inspired admin shell with sidebar + top bar
  - Currently applied to: `/bulletins`
  - Components: `apps/web/src/ui/carbon/`
  - Wrapper: `apps/web/src/components/layout/CarbonShellLayout.tsx`

**See**: [CARBON-SHELL-EXPERIMENT.md](ui/CARBON-SHELL-EXPERIMENT.md) for full details and revert steps.

---

## Frontend Debugging Tips

### SyntaxError in Compiled JS (e.g., `layout.js:149:29`)

If you see a `SyntaxError: Invalid or unexpected token` in browser console pointing to a compiled `.js` file:

1. **Check for stale cache**: Delete `apps/web/.next/` and restart the dev server
2. **Use source maps**: In browser DevTools Sources tab, navigate to the compiled file and use source maps to find the original TSX/TS file
3. **Common culprits**:
   - Smart/curly quotes (`"` `"` `'` `'`) instead of standard quotes
   - Invisible characters (non-breaking spaces, zero-width chars)
   - Unclosed JSX tags or template literals
   - Merge conflict markers (`<<<<<<< HEAD`)
   - Copy-pasted HTML entities

### PWA Manifest Icon Errors

If you see `Error while trying to use the following icon from the Manifest`:

1. **Verify icon exists**: Check `apps/web/public/icon-192.png` and `icon-512.png`
2. **Verify file is valid PNG**: Use `file icon-192.png` to confirm type
3. **Manifest format**: Use separate icon entries for `purpose: "any"` and `purpose: "maskable"` instead of combined `"any maskable"`
4. **Clear browser cache**: Service workers may cache old manifest data

### Icon file location
- PWA icons: `apps/web/public/icon-192.png`, `apps/web/public/icon-512.png`
- Manifest config: `apps/web/public/manifest.json`

---

## Navigation Configuration & Testing

### Shared Nav Config

Navigation items are defined in `apps/web/src/config/navigation.ts`. This is the single source of truth for:
- AppShell sidebar navigation (legacy)
- Role-based visibility (admin, editor, submitter, viewer, kiosk)
- Church shell SidebarRail also references this for consistency

### Updating Navigation Items

When adding or removing navigation items:

1. **Update `navigation.ts`**: Add/remove from `NAV_ITEMS` array
2. **Update tests**: Adjust counts in `apps/web/src/components/layout/__tests__/SidebarNav.test.ts`
   - Update comment header with new counts for each role
   - Add/remove specific item tests (e.g., `it('includes Sunday Planner navigation item')`)
3. **Church shell sync**: If the item should appear in Church shell, update `CHURCH_NAV_ITEMS` in `SidebarRail.tsx`

### Current Nav Item Counts (2025-12-08)

| Role | Visible Items |
|------|---------------|
| Total NAV_ITEMS | 10 |
| Admin | 10 |
| Editor | 10 |
| Submitter | 8 (excludes Donations, Communications) |
| Viewer | 7 (excludes Thank-Yous, Donations, Communications) |
| Kiosk | 1 (Attendance Check-In only) |

---

**Last Updated**: 2025-12-08

# Theology Settings Guide

This document describes the Theology Settings model and the canonical enum + label/value mapping system used throughout the platform.

## Overview

Theology Settings allow a church/organization to express their theological tradition, Bible translation, sermon style, and sensitivity level. These preferences are used by:

- **Sermon Helper AI** - Generates suggestions aligned with the church's theology
- **Content guardrails** - Filters AI responses based on sensitivity level
- **Default selections** - Pre-populates forms with church preferences

## Data Model

### Theological Tradition (`tradition`)

**Type**: `string` (constrained to `THEOLOGICAL_TRADITIONS` enum)

**Canonical Values** (stored in database):
| Value | Description |
|-------|-------------|
| `Non-denominational evangelical` | Non-denominational evangelical churches |
| `Baptist` | Baptist traditions (Reformed, Southern, etc.) |
| `Methodist` | Methodist/Wesleyan traditions |
| `Presbyterian` | Presbyterian traditions (PCA, PCUSA, etc.) |
| `Lutheran` | Lutheran traditions (LCMS, ELCA, etc.) |
| `Anglican` | Anglican/Episcopal churches |
| `Pentecostal` | Pentecostal/Charismatic churches |
| `Catholic` | Roman Catholic churches |
| `Reformed` | Reformed/Orthodox traditions |
| `Other` | Other traditions not listed |

### Bible Translation (`bibleTranslation`)

**Type**: `string` (constrained to `BibleTranslationSchema` enum)

**Values**:
- `ESV` - English Standard Version
- `NIV` - New International Version
- `KJV` - King James Version
- `NKJV` - New King James Version
- `NLT` - New Living Translation
- `NASB` - New American Standard Bible
- `MSG` - The Message
- `CSB` - Christian Standard Bible
- `Other` - Other translations

### Sensitivity Level (`sensitivity`)

**Type**: `string` (constrained to `TheologySensitivitySchema` enum)

**Values**:
| Value | Description |
|-------|-------------|
| `conservative` | Very cautious with sensitive topics |
| `moderate` | Balanced approach with care |
| `progressive` | More latitude for mature discussion |

### Sermon Style (`sermonStyle`)

**Type**: `string` (constrained to `SermonStyleSchema` enum)

**Values**: `expository`, `topical`, `narrative`, `textual`, `biographical`

---

## Canonical vs Display Values

The theology system uses a **canonical value / display label** pattern to handle cases where multiple specific denominations map to a single canonical category.

### The Problem

Users expect to see specific options like "Presbyterian (PCA)" but storing overly specific values creates validation and maintenance issues. The backend schema uses broad canonical values, while the UI shows detailed labels.

### The Solution

| What Users See (UI Label) | What's Stored (Canonical Value) |
|---------------------------|--------------------------------|
| Presbyterian (PCA) | `Presbyterian` |
| Presbyterian (PCUSA) | `Presbyterian` |
| Reformed Baptist | `Baptist` |
| Southern Baptist | `Baptist` |
| Lutheran (LCMS) | `Lutheran` |
| Lutheran (ELCA) | `Lutheran` |
| Anglican/Episcopal | `Anglican` |
| Pentecostal/Charismatic | `Pentecostal` |
| Church of Christ | `Reformed` |
| Orthodox | `Reformed` |

---

## Shared Types (Single Source of Truth)

All theology-related forms **MUST** import from `@elder-first/types`:

```typescript
import {
  // Constants
  THEOLOGICAL_TRADITIONS,        // Canonical values array
  THEOLOGY_TRADITION_OPTIONS,    // Label/value mapping for dropdowns

  // Schemas
  TheologyTraditionSchema,
  BibleTranslationSchema,
  TheologySensitivitySchema,
  SermonStyleSchema,

  // Types
  type TheologyTradition,
  type BibleTranslation,
  type TheologySensitivity,
  type SermonStyle,

  // Helper functions
  getCanonicalTradition,         // label -> canonical value
  getTraditionDisplayLabel,      // canonical value -> label
} from '@elder-first/types';
```

### `THEOLOGICAL_TRADITIONS`

Readonly array of canonical tradition values:

```typescript
export const THEOLOGICAL_TRADITIONS = [
  'Non-denominational evangelical',
  'Baptist',
  'Methodist',
  'Presbyterian',
  'Lutheran',
  'Anglican',
  'Pentecostal',
  'Catholic',
  'Reformed',
  'Other',
] as const;
```

### `THEOLOGY_TRADITION_OPTIONS`

Array of `{ value, label }` pairs for UI dropdowns:

```typescript
export const THEOLOGY_TRADITION_OPTIONS: readonly TheologyTraditionOption[] = [
  { value: 'Non-denominational evangelical', label: 'Non-denominational evangelical' },
  { value: 'Baptist', label: 'Reformed Baptist' },
  { value: 'Baptist', label: 'Southern Baptist' },
  { value: 'Presbyterian', label: 'Presbyterian (PCA)' },
  { value: 'Presbyterian', label: 'Presbyterian (PCUSA)' },
  // ... etc
];
```

### `getCanonicalTradition(labelOrValue: string): TheologyTradition`

Converts a UI label OR canonical value to the canonical value:

```typescript
getCanonicalTradition('Presbyterian (PCA)');  // => 'Presbyterian'
getCanonicalTradition('Presbyterian');        // => 'Presbyterian'
getCanonicalTradition('Unknown');             // => 'Other'
```

### `getTraditionDisplayLabel(value: TheologyTradition): string`

Converts a canonical value to a display label:

```typescript
getTraditionDisplayLabel('Presbyterian');  // => 'Presbyterian (PCA)' (first match)
```

---

## UI Implementation Pattern

When building a theology tradition select dropdown:

```typescript
// 1. Track canonical value in form state
const [formData, setFormData] = useState({
  tradition: 'Non-denominational evangelical' as TheologyTradition,
});

// 2. Track display label separately for the UI
const [selectedLabel, setSelectedLabel] = useState('Non-denominational evangelical');

// 3. On load, convert stored value to display label
useEffect(() => {
  if (profile?.tradition) {
    setSelectedLabel(getTraditionDisplayLabel(profile.tradition));
  }
}, [profile]);

// 4. Render select with label/value options
<select
  value={selectedLabel}
  onChange={(e) => {
    const label = e.target.value;
    const option = THEOLOGY_TRADITION_OPTIONS.find(opt => opt.label === label);
    if (option) {
      setSelectedLabel(label);
      setFormData(prev => ({ ...prev, tradition: option.value }));
    }
  }}
>
  {THEOLOGY_TRADITION_OPTIONS.map((option) => (
    <option key={option.label} value={option.label}>
      {option.label}
    </option>
  ))}
</select>

// 5. Submit canonical value to API
updateTheology.mutate({
  tradition: formData.tradition,  // Always canonical value
});
```

---

## Adding New Values

### Adding a New Canonical Tradition

1. Add to `THEOLOGICAL_TRADITIONS` in `packages/types/src/index.ts`
2. Add corresponding entry to `THEOLOGY_TRADITION_OPTIONS`
3. Run tests: `cd packages/types && npm test -- theologySettings`
4. Update this documentation

### Adding a New UI Label (for existing canonical value)

1. Add new `{ value, label }` to `THEOLOGY_TRADITION_OPTIONS`
2. Run tests to verify
3. No schema changes needed

### Adding a New Bible Translation

1. Add to `BibleTranslationSchema` in `packages/types/src/index.ts`
2. Add to `BIBLE_TRANSLATIONS` in UI components
3. Update this documentation

---

## Related Files

| File | Purpose |
|------|---------|
| `packages/types/src/index.ts` | Schema definitions and constants |
| `packages/types/src/__tests__/theologySettings.test.ts` | 19 tests for validation |
| `apps/web/src/app/settings/theology/page.tsx` | Theology settings UI |
| `apps/api/src/routers/sermonHelper.ts` | Backend API using schemas |

---

## Dev Rules

1. **Never hard-code theology values** - Always use shared constants
2. **Always store canonical values** - Never store UI labels in the database
3. **Use helper functions** - `getCanonicalTradition()` and `getTraditionDisplayLabel()` for conversion
4. **Run tests after changes** - `npm test -- theologySettings` in packages/types

---

## Troubleshooting

### "Invalid enum value" Error

**Cause**: UI sent a display label (e.g., "Presbyterian (PCA)") instead of canonical value ("Presbyterian").

**Fix**: Ensure form state tracks canonical value separately from display label. See "UI Implementation Pattern" above.

### Missing Option in Dropdown

**Cause**: New tradition not added to `THEOLOGY_TRADITION_OPTIONS`.

**Fix**: Add `{ value, label }` entry to the options array in `packages/types/src/index.ts`.

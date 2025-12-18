# Website Field Guide

This document describes how the Website field works in Organization and Bulletin settings.

## Overview

The Website field appears in:
- **Organization Settings** (`/settings/organization`) - Main church website
- **Bulletin Settings** (`/settings/bulletins`) - Used when saving settings that include organization data

## Validation Behavior

The Website field uses the `WebsiteSchema` from `@elder-first/types` for validation. This schema is designed to be user-friendly and handle common input patterns.

### What's Allowed

| Input | Result | Notes |
|-------|--------|-------|
| *(blank/empty)* | Allowed | Website is optional |
| `https://mychurch.org` | Allowed as-is | Full URL with protocol |
| `http://mychurch.org` | Allowed as-is | HTTP also accepted |
| `mychurch.org` | Normalized to `https://mychurch.org` | Auto-adds https:// |
| `www.mychurch.org` | Normalized to `https://www.mychurch.org` | Auto-adds https:// |
| `mychurch.org/about` | Normalized to `https://mychurch.org/about` | Paths preserved |

### What's Rejected

| Input | Reason |
|-------|--------|
| `not a valid url` | Contains spaces |
| `my church.org` | Space in hostname |
| `http://` | Malformed URL |

## Technical Details

### Schema Location

The canonical schema is in `packages/types/src/index.ts`:

```typescript
export const WebsiteSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value || value.trim() === '') return undefined;
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  })
  .refine(
    (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid url' }
  );
```

### Where It's Used

- **API Router**: `apps/api/src/routers/org.ts` - `updateBranding` mutation
- **Frontend**: Both organization and bulletin settings pages validate URLs client-side
- **Tests**: `packages/types/src/__tests__/websiteSchema.test.ts`

## Relation to AI Settings

When enabling AI settings on the Bulletin Settings page (`/settings/bulletins`), the entire organization branding object is saved. This includes the Website field from the organization settings.

If the website was stored with a bare hostname (e.g., `mychurch.org` without `https://`), it would previously fail validation. The `WebsiteSchema` now automatically normalizes this to `https://mychurch.org`, preventing validation errors.

## Frontend Form Behavior

Both settings pages:
1. Accept bare hostnames (e.g., `mychurch.org`) without showing validation errors
2. Display the normalized URL (with `https://`) after saving
3. Allow empty values (website is optional)

## Seed Data

If you're working with seed data, always use full URLs with protocols:

```typescript
// Good
church_website: 'https://www.firsttestchurch.org'

// Avoid (will work but not recommended)
church_website: 'www.firsttestchurch.org'
```

## Troubleshooting

### "Invalid url" Error When Saving Settings

If you encounter an "Invalid url" validation error:

1. Check that the website doesn't contain spaces
2. Ensure it's a valid hostname or URL
3. The system will auto-add `https://` if missing

### Website Not Updating After Save

After saving, the form should display the normalized URL. If the display doesn't update:

1. Check browser console for errors
2. Verify the save was successful
3. Refresh the page to reload from the server

# Bulletins Page

This document describes the Bulletins page functionality, including the filter dropdown and bulletin card display.

## Overview

The Bulletins page (`/bulletins`) displays a grid of bulletin cards that users can filter based on their status. By default, the page shows only **active** (published) bulletins, hiding drafts and deleted items.

## Filter Dropdown

### Location

The filter dropdown appears above the bulletins grid, allowing users to switch between different views.

### Filter Options

| Filter Value | Label | Description |
|--------------|-------|-------------|
| `active` | Active (Published) | Shows only approved, built, and locked bulletins. **Default** |
| `drafts` | Drafts | Shows only draft bulletins (not yet published) |
| `deleted` | Deleted | Shows only soft-deleted bulletins |
| `all` | All | Shows all non-deleted bulletins including drafts |

### Default Behavior

- The default filter is **`active`**, which hides drafts and deleted bulletins
- This ensures users see only published bulletins by default
- Drafts are accessible via the "Drafts" filter when needed
- Deleted bulletins can be reviewed via the "Deleted" filter

## Bulletin Cards

Each bulletin card displays:

1. **Service Date** - The date of the service in a human-readable format
2. **Status Chip** - A single color-coded chip showing the bulletin status (see below)
3. **Created Date** - When the bulletin was created

### Status Chip (Single Chip Pattern)

Each bulletin card displays exactly **one** status chip. This prevents duplicate tags and ensures clear visual communication.

| Status | Chip Color | When Shown |
|--------|------------|------------|
| 🔴 **Deleted** | Red (`bg-red-100`) | When bulletin is soft-deleted (`status='deleted'` OR `deletedAt` is set) |
| 🟢 **Locked** | Green (`bg-green-100`) | Finalized and ready for distribution |
| 🔵 **Built** | Blue (`bg-blue-100`) | Preview has been generated |
| 🟡 **Approved** | Yellow (`bg-yellow-100`) | Content has been approved |
| ⚪ **Draft** | Gray (`bg-gray-100`) | Work in progress |

**Important:** Deleted bulletins show only the red "Deleted" chip. They do NOT show both a status chip and a deleted chip. This single-chip pattern prevents the duplicate "Deleted" tags that could occur when both `status='deleted'` and `deletedAt` are set (which the CHECK constraint now enforces).

### Deleted Bulletins Visibility

- Deleted bulletins are **only visible** when the "Deleted" filter is active
- They are hidden from "Active", "Drafts", and "All" filters
- Each deleted bulletin shows a single, clear "Deleted" chip (no duplicates)

## Empty States

Different messages are shown when no bulletins match the current filter:

| Filter | Empty State Message | Show Create Button |
|--------|---------------------|-------------------|
| `active` | "No published bulletins yet. Create your first bulletin to get started." | Yes |
| `drafts` | "No draft bulletins found." | No |
| `deleted` | "No deleted bulletins found." | No |
| `all` | "No bulletins yet. Create your first bulletin to get started." | Yes |

## API Integration

### Backend Endpoint

The bulletins list is fetched via tRPC:

```typescript
trpc.bulletins.list.useQuery({
  filter: 'active', // or 'drafts', 'deleted', 'all'
  limit: 50,
  offset: 0,
})
```

### Filter Schema (Backend)

The filter is validated using Zod:

```typescript
const BulletinFilterSchema = z.enum(['active', 'drafts', 'deleted', 'all']);
```

### Query Logic

The backend applies different WHERE conditions based on the filter.

**Canonical Rule (enforced by CHECK constraint):**
- `deleted_at IS NOT NULL` ⟺ `status = 'deleted'`
- The CHECK constraint `bulletin_deleted_consistent` ensures both fields are always in sync
- Filter logic uses only `deleted_at` as the canonical flag

| Filter | WHERE Conditions |
|--------|------------------|
| `active` | `deleted_at IS NULL AND status IN ('approved', 'built', 'locked')` |
| `drafts` | `deleted_at IS NULL AND status = 'draft'` |
| `deleted` | `deleted_at IS NOT NULL` |
| `all` | `deleted_at IS NULL` |

## Implementation Files

- **Frontend Page**: `apps/web/src/app/bulletins/page.tsx`
- **Backend Router**: `apps/api/src/routers/bulletins.ts`
- **Backend Tests**: `apps/api/src/__tests__/bulletinsFilter.test.ts`
- **Frontend Tests**: `apps/web/src/app/bulletins/__tests__/BulletinsPage.test.ts`

## Testing

### Backend Tests (35 tests)

- BulletinFilterSchema validation
- BulletinStatusSchema validation
- Filter logic for each option
- Default behavior
- Bulletin visibility matrix (uses canonical `deleted_at` flag)
- CHECK constraint behavior (documents `bulletin_deleted_consistent`)

### Frontend Tests (29 tests)

- Filter type definition
- Filter options configuration
- Default filter value
- Empty state messages
- Create button visibility
- Bulletin card display
- Deleted badge display
- Filter state transitions

---

**Last Updated**: 2025-12-06

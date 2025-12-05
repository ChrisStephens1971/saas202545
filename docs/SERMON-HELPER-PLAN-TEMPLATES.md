# Sermon Helper: Plan & Templates System

## Overview

Phase 5 of the Sermon Helper introduces a persistent **Sermon Plan** model and reusable **Sermon Templates** to help pastors structure, save, and reuse sermon outlines. Additionally, an AI-powered **Manuscript Import** feature allows pastors to extract structured outlines from existing sermon manuscripts.

## Features

### 1. Sermon Plans

A Sermon Plan is a structured outline attached to a specific sermon. It persists the work done in the Sermon Builder UI.

**Key Fields:**
- `sermonId` - Links to the parent sermon
- `title` - Working title for the sermon
- `bigIdea` - Main takeaway or thesis
- `primaryText` - Main scripture reference
- `supportingTexts` - Array of additional scripture references
- `elements` - Array of outline elements (sections, points, notes, scriptures, hymns)
- `tags` - Array of topic/theme tags

**Database Table:** `sermon_plans`

### 2. Sermon Templates

A Sermon Template is a reusable outline structure that can bootstrap new sermons. Templates are created by saving an existing sermon plan's structure.

**Key Fields:**
- `name` - Display name for the template
- `defaultTitle` - Suggested sermon title when using template
- `defaultBigIdea` - Suggested big idea
- `defaultPrimaryText` - Suggested primary scripture
- `defaultSupportingTexts` - Suggested supporting scriptures
- `structure` - Array of outline elements (skeleton structure)
- `tags` - Array of tags for search/filter

**Database Table:** `sermon_templates`

### 3. Manuscript Import (Beta)

AI-powered extraction of structured outlines from sermon manuscripts. Pastors can paste an existing manuscript and have AI extract:
- Title and big idea
- Main points and sub-points
- Scripture references
- Hymn suggestions
- Application notes

## API Endpoints

### Sermon Plans

```typescript
// Get sermon plan
sermonHelper.getPlan({ sermonId: string })
// Returns: SermonPlan | null

// Save sermon plan (create or update)
sermonHelper.savePlan({
  sermonId: string,
  title: string,
  bigIdea: string,
  primaryText: string,
  supportingTexts: string[],
  elements: SermonElement[],
  tags: string[],
  notes?: string
})
// Returns: { id: string, success: boolean }
```

### Sermon Templates

```typescript
// List templates
sermonHelper.listTemplates({ limit?: number, offset?: number })
// Returns: { templates: SermonTemplateListItem[], total: number }

// Get full template
sermonHelper.getTemplate({ templateId: string })
// Returns: SermonTemplate

// Create template from existing plan
sermonHelper.createTemplateFromPlan({
  sermonId: string,
  name: string,
  tags: string[]
})
// Returns: { id: string, success: boolean }
```

### Manuscript Import

```typescript
// Extract outline from manuscript
sermonHelper.importFromManuscript({
  sermonId: string,
  manuscriptText: string
})
// Returns: SermonPlanDraft
```

**Privacy Note:** Manuscript text is processed by AI but is NOT logged or stored. Only the extracted structure is returned.

## UI Components

### SermonBuilder Integration

The SermonBuilder component (`apps/web/src/components/sermons/SermonBuilder.tsx`) now includes:
- Auto-save of plan changes
- "Save as Template" button on the finalize step

### SaveAsTemplateModal

Located at `apps/web/src/components/sermons/SaveAsTemplateModal.tsx`

Features:
- Template name input (3-200 characters)
- Tag input with add/remove (max 10 tags)
- Success confirmation with auto-close
- Validation feedback

### TemplateSelector

Located at `apps/web/src/components/sermons/TemplateSelector.tsx`

Features:
- Collapsible "Start from Template" section
- Search/filter templates
- Template preview with tags
- Loading states for async fetch
- Pre-fills form with template defaults

### ManuscriptImportModal

Located at `apps/web/src/app/sermons/[id]/_components/ManuscriptImportModal.tsx`

Features:
- Large textarea for manuscript input
- Privacy notice about data handling
- Two-step flow: Extract -> Review -> Import
- Element preview for each extracted item
- Edit capability before import

## User Flows

### Creating a Sermon from Template

1. Navigate to `/sermons/new`
2. Click "Start from Template" to expand selector
3. Search or browse available templates
4. Select a template (form pre-fills with defaults)
5. Complete required fields (date, etc.)
6. Submit to create sermon
7. Template structure is applied as the sermon's plan

### Saving a Plan as Template

1. Open an existing sermon with a plan
2. Work in the Sermon Builder
3. On the "Finalize" step, click "Save as Template"
4. Enter template name and optional tags
5. Click "Save Template"
6. Template is now available for future sermons

### Importing from Manuscript

1. Open an existing sermon
2. Click "Import from Manuscript" panel
3. Paste manuscript text (min 100 chars)
4. Click "Extract Outline"
5. Review AI-extracted structure
6. Edit if needed
7. Click "Import" to apply to sermon plan

## Data Models

### SermonElement Types

```typescript
type SermonElement =
  | { type: 'section'; title: string; level: number }
  | { type: 'point'; content: string; level: number }
  | { type: 'note'; content: string }
  | { type: 'scripture'; reference: string; text?: string }
  | { type: 'hymn'; title: string; hymnalReference?: string };
```

### SermonPlan Schema

```typescript
interface SermonPlan {
  id: string;           // UUID
  tenantId: string;     // UUID
  sermonId: string;     // UUID (references sermon table)
  title: string;        // max 200 chars
  bigIdea: string;      // max 500 chars
  primaryText: string;  // max 100 chars
  supportingTexts: string[];
  elements: SermonElement[];
  tags: string[];
  notes?: string;
  createdAt: string;    // ISO datetime
  updatedAt: string;    // ISO datetime
}
```

### SermonTemplate Schema

```typescript
interface SermonTemplate {
  id: string;              // UUID
  tenantId: string;        // UUID
  name: string;            // max 200 chars
  defaultTitle: string;    // max 200 chars
  defaultBigIdea: string;  // max 500 chars
  defaultPrimaryText: string;
  defaultSupportingTexts: string[];
  structure: SermonElement[];
  tags: string[];
  createdAt: string;       // ISO datetime
  updatedAt: string;       // ISO datetime
}
```

## Database Migration

Migration file: `packages/database/migrations/005_sermons_and_gratitude.sql`

Creates:
- `sermon_plans` table with JSONB columns for elements and supporting texts
- `sermon_templates` table with JSONB columns for structure
- Appropriate indexes for tenant queries
- Foreign key constraints to sermon table

## Security Considerations

1. **Tenant Isolation:** All queries filter by `tenant_id` from the authenticated context
2. **Role Requirements:** Most endpoints require `protectedProcedure` (authenticated user)
3. **Template Creation:** Requires `editorProcedure` (Editor or Admin role)
4. **Manuscript Privacy:** Text is processed but never stored or logged
5. **AI Rate Limiting:** Manuscript import respects tenant AI quota limits

## Configuration

No additional configuration required. The feature uses the existing:
- Database connection
- OpenAI API key (for manuscript import)
- Tenant AI quota settings

## Testing

Phase 5b added comprehensive test coverage for all Plan & Templates functionality.

### Test Files

| Test File | Location | Tests |
|-----------|----------|-------|
| Types Validation | `packages/types/src/__tests__/sermonPlan.test.ts` | 68 |
| API Endpoints | `apps/api/src/__tests__/sermonPlanTemplates.test.ts` | 72 |
| ManuscriptImportModal | `apps/web/src/app/sermons/[id]/_components/__tests__/ManuscriptImportModal.test.ts` | 48 |
| SaveAsTemplateModal | `apps/web/src/components/sermons/__tests__/SaveAsTemplateModal.test.ts` | 54 |
| TemplateSelector | `apps/web/src/components/sermons/__tests__/TemplateSelector.test.ts` | 51 |

### Running Tests

```bash
# Types validation tests
cd packages/types && npm test

# API tests
cd apps/api && npm test -- src/__tests__/sermonPlanTemplates.test.ts

# UI logic tests
cd apps/web && npm test
```

### Test Coverage

**Types Validation (68 tests):**
- `SermonElementSchema` - All 5 element types (section, point, note, scripture, hymn)
- `SermonPlanSchema` / `SermonPlanInputSchema` - Field validation, constraints
- `SermonPlanDraftSchema` - AI extraction response validation
- `SermonTemplateSchema` / `SermonTemplateInputSchema` - Template field validation
- `ManuscriptImportInputSchema` - Character limits (100-50,000)

**API Endpoints (72 tests):**
- Input validation for all 6 endpoints
- Response transformation (snake_case DB → camelCase API)
- AI response parsing with markdown fence handling
- Business logic (template creation, plan upsert, draft building)
- Tenant isolation verification

**UI Logic (153 tests across 3 components):**

*ManuscriptImportModal:*
- Character count validation (100 min, 50,000 max)
- Element type validation (section, point, note, scripture, hymn)
- Draft structure validation
- State machine transitions (input → extracting → review → import)
- Button state logic
- Privacy compliance (manuscript not stored in draft)

*SaveAsTemplateModal:*
- Template name validation (3-200 characters)
- Tag management (add, remove, normalize, max 10)
- Duplicate tag prevention (case-insensitive)
- State transitions (editing → saving → success)
- Keyboard interactions (Enter, Escape, comma for tags)

*TemplateSelector:*
- Template filtering by name, title, and tags
- Selection/deselection toggle logic
- Expansion and loading states
- Tag display truncation (max 3 visible)
- Empty state handling
- Error recovery

### Test Approach

All tests use Jest and run in Node environment (no DOM required). Tests focus on:
1. **Validation logic** - Input constraints and error messages
2. **State management** - Component state transitions
3. **Business rules** - Character limits, tag limits, privacy requirements
4. **Data transformation** - API response mapping

AI calls are mocked in API tests - no real OpenAI requests are made during testing.

## Future Enhancements

- Template sharing between tenants (community templates)
- Template categories/collections
- Version history for plans
- Collaborative editing
- Export to various formats (PDF, Word, etc.)
- Template analytics (usage tracking)

# Sermon Helper Feature - Design Document

**Date:** 2025-12-03
**Status:** Phase 3 Complete (Testing & Hardening + Runtime Guardrails)
**Backend Documentation:** [SERMON-HELPER-BACKEND.md](./SERMON-HELPER-BACKEND.md)
**UI Documentation:** [SERMON-HELPER-UI.md](./SERMON-HELPER-UI.md)

## Overview

The Sermon Helper is an AI-powered feature that assists pastors in preparing sermons with **theological guardrails driven by each church's configuration**. It integrates into the existing sermon workflow at `/sermons/[id]`.

## Current System Analysis

### Existing Infrastructure

1. **Sermon Model** (`packages/database/migrations/005_sermons_and_gratitude.sql`)
   - `outline` (JSONB) - Already stores sermon structure
   - `path_stage` - 4-stage workflow: text_setup → big_idea → outline → finalize
   - `status` - idea, draft, ready, preached

2. **Song Model** (`migrations/024_add_song_model.sql`)
   - Full hymnal support with CCLI, tune names, hymn numbers
   - Links to service items via `song_id`

3. **OpenAI Integration** (`apps/api/src/routers/sermonHelper.ts`)
   - `gpt-4o-mini` model
   - Encrypted API key storage
   - Per-tenant quota enforcement
   - Usage tracking in `ai_usage_events`

4. **Org Settings** (`brand_pack` table)
   - Organization branding
   - Bulletin AI settings
   - **Theology profile** - Added in migration 036

### Phase 1 Complete (Backend)

1. **Theology Profile** - Migration 036, stored in `brand_pack`
2. **Theology-Aware Prompts** - `buildTheologyAwareSystemPrompt()` in router
3. **Hymn Search** - `searchHymns` endpoint implemented
4. **SermonElement Model** - Zod schema in `@elder-first/types`
5. **Backend Tests** - 26 tests in `sermonHelper.test.ts`

### Phase 2 Complete (Frontend)

1. **SermonHelperPanel** - Tab container with AI Suggestions, Hymn Finder, Outline tabs
2. **SermonHelperAISuggestions** - AI panel calling `getAISuggestions` mutation
3. **SermonHelperHymnFinder** - Hymn search calling `searchHymns` query
4. **SermonHelperOutline** - Full CRUD editor with export to Markdown
5. **Frontend Tests** - 32 tests in `apps/web/src/app/sermons/[id]/__tests__/SermonHelperOutline.test.ts`

> **Note:** Sermon Helper UI/outline tests live under `apps/web`; `packages/types` is reserved for shared types/schemas only.

### Phase 3 Complete (Testing & Hardening)

1. **Backend Integration Tests** - Extended `sermonHelper.test.ts` with guardrail tests across denominations
2. **UI Component Tests** - 3 new test files for AISuggestions, HymnFinder, Panel logic
3. **Total Test Count** - 375 backend tests, 165 web tests (540 total)
4. **E2E** - Skipped (no Playwright/Cypress infrastructure exists)

## Feature Location

The Sermon Helper will be integrated into:
- **Primary:** `/sermons/[id]` page as a new "AI Helper" tab/panel
- **Components:** `apps/web/src/components/sermons/SermonHelper/`

## Data Model

### Theology Profile (New)

Add to `brand_pack` table:

```sql
-- Theology profile columns
theology_tradition VARCHAR(100) DEFAULT 'Non-denominational evangelical',
theology_bible_translation VARCHAR(20) DEFAULT 'ESV',
theology_sermon_style VARCHAR(50) DEFAULT 'expository',
theology_sensitivity VARCHAR(20) DEFAULT 'moderate',
theology_restricted_topics TEXT[] DEFAULT '{}',
theology_preferred_tone VARCHAR(100) DEFAULT 'warm and pastoral'
```

### SermonElement Discriminated Union

```typescript
type SermonElement =
  | { id: string; type: 'section'; title: string }
  | { id: string; type: 'point'; text: string }
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'scripture'; reference: string; note?: string }
  | { id: string; type: 'hymn'; hymnId: string; title: string; note?: string };
```

### AI Response Schema

```typescript
interface SermonHelperSuggestions {
  scriptureSuggestions: Array<{
    reference: string;
    reason: string;
  }>;
  outline: Array<{
    type: 'section' | 'point';
    title?: string;
    text?: string;
  }>;
  applicationIdeas: Array<{
    audience: 'believers' | 'seekers' | 'youth' | 'families';
    idea: string;
  }>;
  hymnThemes: Array<{
    theme: string;
    reason: string;
  }>;
}
```

## API Layer

### New Endpoints in `sermonHelper` Router

1. **`sermonHelper.getTheologyProfile`** - Get church's theology config
2. **`sermonHelper.updateTheologyProfile`** (admin) - Update theology config
3. **`sermonHelper.getAISuggestions`** - Main AI endpoint with theology-aware prompts
4. **`sermonHelper.searchScripture`** - Search Bible passages by theme
5. **`sermonHelper.searchHymns`** - Search songs/hymns by theme

### System Prompt Construction

The system prompt will be built dynamically from `theologyProfile`:

```
You are a sermon preparation assistant for "{churchName}".

Theological Profile:
- Tradition: {tradition}
- Preferred Bible translation: {preferredBibleTranslation}
- Sermon style: {sermonStyle}
- Sensitivity level: {sensitivityLevel}
- Restricted topics: {restrictedTopicsList}

Rules:
1. Stay within mainstream {tradition} theology.
2. Return ONLY scripture references, not full text.
3. Avoid restricted topics unless explicitly requested.
4. No partisan politics or culture-war framing.
5. Keep suggestions pastoral, humble, and helpful.
```

## Frontend Components

```
apps/web/src/app/sermons/[id]/_components/
├── index.ts                        # Barrel exports
├── SermonHelperPanel.tsx           # Main container with tabs
├── SermonHelperAISuggestions.tsx   # AI suggestions interface
├── SermonHelperHymnFinder.tsx      # Hymn search/add
└── SermonHelperOutline.tsx         # Editable outline with export
```

## Guardrails Checklist

- [x] No OpenAI calls from frontend
- [x] All AI calls use tenant theology profile
- [x] No secrets in client bundles
- [x] AI returns references only, not raw Bible text
- [x] No partisan political content
- [x] JSON responses validated with Zod
- [x] Fallback to empty response on parse errors
- [x] Usage logged to `ai_usage_events`
- [x] Quota enforcement per tenant
- [x] **Restricted topic hard block** - Input checked BEFORE calling AI
- [x] **Political content post-filter** - Response filtered AFTER AI call
- [x] **UI feedback banners** - Amber (restricted) and blue (filtered) banners

## Implementation Phases

1. **Phase 1:** ✅ Backend - Data model, migration, theology-aware OpenAI, tests, docs
2. **Phase 2:** ✅ Frontend - SermonHelperPanel, AI Suggestions, Hymn Finder, Outline Editor, Export, tests, docs
3. **Phase 3:** ✅ Testing & Hardening - Integration tests, UI component tests, documentation

## Testing Strategy

- [x] Unit tests for theology profile prompt construction (`apps/api/src/__tests__/sermonHelper.test.ts`)
- [x] Unit tests for JSON parsing with fallbacks (`apps/api/src/__tests__/sermonHelper.test.ts`)
- [x] Unit tests for SermonElement CRUD, reordering, export (`apps/web/src/app/sermons/[id]/__tests__/SermonHelperOutline.test.ts`)
- [x] Integration tests for AI response parsing and guardrail enforcement (`apps/api/src/__tests__/sermonHelper.test.ts`)
- [x] UI logic tests for all Sermon Helper components (`apps/web/src/app/sermons/[id]/__tests__/`)
- [ ] E2E smoke test for helper workflow (requires Playwright setup)

### Test Commands

```bash
# Run all tests
npm test

# Run API tests only
npm run test:api

# Run web tests only (from apps/web)
cd apps/web && npm test

# Run tests in watch mode
cd apps/web && npm run test:watch
```

### Test Files

| Package | File | Description |
|---------|------|-------------|
| `apps/api` | `src/__tests__/sermonHelper.test.ts` | Backend tests: theology profile, prompt construction, JSON parsing, guardrails, integration |
| `apps/web` | `src/app/sermons/[id]/__tests__/SermonHelperOutline.test.ts` | Outline CRUD, reordering, Markdown export |
| `apps/web` | `src/app/sermons/[id]/__tests__/SermonHelperAISuggestions.test.ts` | Input validation, response handling, element creation, loading states |
| `apps/web` | `src/app/sermons/[id]/__tests__/SermonHelperHymnFinder.test.ts` | Search logic, result display, add to outline |
| `apps/web` | `src/app/sermons/[id]/__tests__/SermonHelperPanel.test.ts` | Tab navigation, element state, badge display |

### Test Location Guidelines

- **Backend tests** (`apps/api/src/__tests__/`) - API router tests, AI logic, database queries
- **Web UI tests** (`apps/web/src/**/__tests__/`) - Component behavior, UI logic, outline operations
- **Type/schema tests** (`packages/types/src/__tests__/`) - Zod schema validation, type helper functions

> Do not move web/UI tests into `packages/types`. If `apps/web` lacks a test harness, set one up instead of using `packages/types` as a dumping ground.

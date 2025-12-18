# Sermon Helper UI - Phase 9 Implementation

## Overview

The Sermon Helper UI provides a tabbed interface for pastors to prepare sermons with AI-assisted suggestions, hymn discovery, and outline management. This document covers the UI implementation through Phase 9 (Preach Mode & Print from SermonPlan).

## Architecture

### Component Structure

```
apps/web/src/app/sermons/[id]/
├── page.tsx                    # Main sermon detail page (integrates SermonHelperPanel)
└── _components/
    ├── index.ts                # Barrel exports
    ├── SermonHelperPanel.tsx   # Main container with tab navigation
    ├── SermonHelperAISuggestions.tsx  # AI suggestions tab
    ├── SermonHelperHymnFinder.tsx     # Hymn search tab
    ├── SermonHelperOutline.tsx        # Outline editor tab
    ├── ManuscriptImportModal.tsx      # Import manuscript modal
    └── GenerateDraftModal.tsx         # Phase 8: Generate preaching draft modal
```

### Data Flow

```
SermonHelperPanel (manages shared state)
├── elements: SermonElement[]     # Shared outline state
├── onAddToOutline()              # Callback to add elements
│
├── SermonHelperAISuggestions
│   └── Calls tRPC: sermonHelper.getAISuggestions
│   └── Generates elements → onAddToOutline()
│
├── SermonHelperHymnFinder
│   └── Calls tRPC: sermonHelper.searchHymns
│   └── Creates hymn elements → onAddToOutline()
│
└── SermonHelperOutline
    └── Displays & edits elements[]
    └── Export to Markdown
```

## Components

### SermonHelperPanel

**Location:** `_components/SermonHelperPanel.tsx`

Main container that manages:
- Tab navigation (AI Suggestions, Hymn Finder, Outline Editor)
- Shared `SermonElement[]` state across all tabs
- `onAddToOutline()` callback for child components

**Props:**
```typescript
interface SermonHelperPanelProps {
  sermonId: string;
  sermonTitle: string;
  primaryScripture: string | null;
}
```

**Usage:**
```tsx
<SermonHelperPanel
  sermonId={sermonId}
  sermonTitle={sermon.title}
  primaryScripture={sermon.primary_scripture}
/>
```

### SermonHelperAISuggestions

**Location:** `_components/SermonHelperAISuggestions.tsx`

Provides AI-powered sermon preparation assistance:

- **Scripture Suggestions:** Related verses for the sermon theme
- **Outline Skeleton:** Suggested structure with sections and points
- **Application Ideas:** Practical application suggestions
- **Illustration Suggestions:** Style-aware illustration recommendations (Phase 7)
- **Hymn Themes:** Thematic hymn recommendations

**Backend Integration:**
```typescript
const suggestions = trpc.sermonHelper.getAISuggestions.useMutation();

await suggestions.mutateAsync({
  sermonId,
  sermonTitle,
  primaryScripture,
});
```

**AI Request Types:**
- `scriptures` - Related scripture passages
- `outline` - Sermon structure suggestions
- `applications` - Practical application ideas
- `illustrations` - Style-aware illustration ideas (Phase 7)
- `hymns` - Thematic hymn recommendations

Each suggestion type has an "Add to Outline" button that creates appropriate `SermonElement` entries.

**Illustration Suggestions (Phase 7):**

The Illustration Suggestions section displays AI-generated illustration ideas shaped by the sermon's `styleProfile`:

| Style | Illustration Focus |
|-------|-------------------|
| Story-First 3-Point | Narrative illustrations, personal stories, emotional connections |
| Expository Verse-by-Verse | Text-focused illustrations, historical context, word meanings |
| Topical Teaching | Contemporary life situations, practical applications |

Each illustration displays:
- **Title:** Brief illustration name
- **Summary:** Description of the illustration
- **For Section Badge:** (optional) Target section for the illustration
- **Add Button:** Creates an `illustration` element in the outline

**Guardrail Banners:**

The component displays banners when guardrails are triggered:

| Banner | Color | Condition | Message |
|--------|-------|-----------|---------|
| Restricted Topic | Amber | `meta.restrictedTopicTriggered` | "AI suggestions are disabled for this topic by your church's theology settings." |
| Content Filtered | Blue | `meta.politicalContentDetected` | "Some suggestions were removed due to political content." |

**Restricted Topic Banner:**
- Appears when the theme, notes, or sermon title match a restricted topic
- AI is NOT called (no tokens consumed)
- Empty suggestions returned
- Pastor should handle this content personally

**Political Content Banner:**
- Appears when AI response contained political keywords that were filtered
- Suggestions still displayed (filtered versions)
- Reminds pastor to focus on Christ-centered, non-partisan teaching

**State Management:**
```typescript
const [restrictedTopicTriggered, setRestrictedTopicTriggered] = useState(false);
const [politicalContentDetected, setPoliticalContentDetected] = useState(false);

// In onSuccess:
setRestrictedTopicTriggered(data.meta.restrictedTopicTriggered ?? false);
setPoliticalContentDetected(data.meta.politicalContentDetected ?? false);
```

### SermonHelperHymnFinder

**Location:** `_components/SermonHelperHymnFinder.tsx`

Searches the church's hymn library:

**Features:**
- Text search by title, tune name, or lyrics
- Displays hymnal code, tune name, author, CCLI status
- One-click add to outline

**Backend Integration:**
```typescript
const { data: hymns } = trpc.sermonHelper.searchHymns.useQuery({
  query: searchQuery,
  limit: 20,
});
```

**Result Display:**
- Hymn title with alternate title
- Hymnal code and number (e.g., "PH #345")
- Tune name badge
- Public domain / CCLI indicators
- "Add" button for each result

### SermonHelperOutline

**Location:** `_components/SermonHelperOutline.tsx`

Full-featured outline editor:

**Element Types:**
| Type | Fields | Display |
|------|--------|---------|
| `section` | `title` | H3 header, blue styling |
| `point` | `text` | Bullet point, green styling |
| `note` | `text` | Italic, yellow styling |
| `scripture` | `reference`, `note` | Bold reference, purple styling |
| `hymn` | `hymnId`, `title`, `note` | Music icon, teal styling |
| `illustration` | `title`, `note` | Quote icon, orange styling (Phase 7) |

**Operations:**
- **Add:** Dropdown menu for element types
- **Edit:** Inline text inputs for each field
- **Reorder:** Up/Down arrow buttons
- **Delete:** Trash icon with confirmation
- **Export:** Copy to clipboard as Markdown

**Props:**
```typescript
interface SermonHelperOutlineProps {
  elements: SermonElement[];
  onElementsChange: (elements: SermonElement[]) => void;
  sermonTitle: string;
}
```

### GenerateDraftModal (Phase 8)

**Location:** `_components/GenerateDraftModal.tsx`

AI-powered preaching draft generation from an existing SermonPlan:

**Purpose:**
- Generates a full preaching manuscript (markdown) from the sermon plan
- Draft is ephemeral (not stored in database) - copy for use elsewhere
- Respects all existing guardrails (restricted topics, political filtering)
- Shaped by theology profile (tradition, style, Bible translation)

**Props:**
```typescript
interface GenerateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sermonId: string;
  sermonTitle: string;
}
```

**Usage:**
```tsx
<GenerateDraftModal
  isOpen={isGenerateDraftModalOpen}
  onClose={() => setIsGenerateDraftModalOpen(false)}
  sermonId={sermonId}
  sermonTitle={sermon.title}
/>
```

**State Management:**
```typescript
const [generatedDraft, setGeneratedDraft] = useState<SermonDraft | null>(null);
const [politicalContentDetected, setPoliticalContentDetected] = useState(false);
const [error, setError] = useState<string | null>(null);
const [copied, setCopied] = useState(false);
```

**Backend Integration:**
```typescript
const generateMutation = trpc.sermonHelper.generateDraftFromPlan.useMutation({
  onSuccess: (data) => {
    setGeneratedDraft(data.draft);
    setPoliticalContentDetected(data.meta.politicalContentDetected ?? false);
    setError(null);
  },
  onError: (err) => {
    setError(err.message || 'Failed to generate draft');
  },
});
```

**Modal Flow:**
1. **Auto-Generate on Open:** When modal opens, immediately triggers generation
2. **Loading State:** Shows spinner with "Generating your preaching draft..."
3. **Success State:** Displays draft with metadata badges and copy button
4. **Error State:** Shows error message with helpful hints based on error type
5. **Regenerate:** Button to generate a new draft

**Display Elements:**

| Element | Description |
|---------|-------------|
| Success Banner | Green banner confirming draft generation |
| Political Filter Banner | Blue banner when content was filtered (optional) |
| Style Profile Badge | Purple badge showing sermon style (e.g., "story first 3 point") |
| Theology Tradition Badge | Gray badge showing tradition (e.g., "Reformed Baptist") |
| Character Count | Gray badge showing manuscript length |
| Manuscript Viewer | Pre-formatted markdown content with scroll |
| Copy Button | One-click copy to clipboard with feedback |

**Error Handling:**

| Error Type | Display |
|------------|---------|
| Restricted Topic | Amber banner explaining topic is blocked by church settings |
| No Sermon Plan | Blue banner with instructions to create plan first |
| AI Quota Exceeded | Red error showing monthly limit reached |
| Configuration Error | Red error with link to settings |
| Generic API Error | Red error with retry suggestion |

**Privacy Note:**
The modal footer displays "Generated with AI - Not stored in database" to remind users that drafts are ephemeral and not persisted.

## SermonElement Type

Defined in `@elder-first/types`:

```typescript
type SermonElement =
  | { id: string; type: 'section'; title: string }
  | { id: string; type: 'point'; text: string }
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'scripture'; reference: string; note?: string }
  | { id: string; type: 'hymn'; hymnId: string; title: string; note?: string }
  | { id: string; type: 'illustration'; title: string; note?: string };  // Phase 7 addition
```

## Export to Markdown

The outline editor exports to Markdown format:

```markdown
# Sermon Title

## Sermon Outline

### Introduction

- **Point:** God's love is unconditional
- **Scripture:** John 3:16 — Key verse of the sermon
- *Note:* Personal testimony here

### Main Body

- **Point:** We are called to respond
- **Hymn:** Amazing Grace — All verses

### Conclusion

---
*Generated by Elder-First Church Platform*
```

## Testing

Logic tests are in `packages/types/src/__tests__/SermonElementLogic.test.ts`:

```bash
cd packages/types && npm test
```

**Test Coverage:**
- Element creation (all 6 types including illustration)
- Element updates (partial updates, preserving other fields)
- Element deletion
- Element reordering (moveUp, moveDown, boundary conditions)
- Markdown export (all element types, ordering, edge cases)
- Type guards (discriminated union validation)
- Illustration suggestions (Phase 7)
  - Add illustration element
  - Display illustration suggestions
  - forSection badge handling

**Total Tests:** 41 tests covering all outline operations

### GenerateDraftModal Tests (Phase 8)

**Location:** `apps/web/src/app/sermons/[id]/_components/__tests__/GenerateDraftModal.test.ts`

```bash
cd apps/web && npm test -- GenerateDraftModal
```

**Test Coverage (44 tests):**

| Category | Tests |
|----------|-------|
| SermonDraft Structure | 13 tests - field validation, style profiles, required fields |
| Meta Response Structure | 7 tests - tokensUsed, model, politicalContentDetected |
| Component State Logic | 8 tests - modal state machine, copy to clipboard |
| Error Handling | 8 tests - restricted topics, no plan, quota, configuration |
| Draft Content Validation | 4 tests - markdown format, style profile formatting |
| Political Content Filtering | 2 tests - filtered content detection, clean content |
| Privacy and Ephemeral Nature | 2 tests - no database fields, no input storage |
| Regeneration Flow | 3 tests - state reset, button visibility |

**Key Test Scenarios:**
1. Complete draft with all fields validates correctly
2. Minimal draft with required fields only validates
3. Invalid style profiles are rejected
4. Modal state transitions (loading → success → regenerate)
5. Political content warning when detected
6. Error states for various failure modes
7. Clipboard copy functionality
8. Draft privacy verification (ephemeral, not stored)

## Integration Points

### Sermon Detail Page

The panel is integrated in `page.tsx`:

```tsx
{/* Sermon Helper Section - AI Suggestions, Hymn Finder, Outline Editor */}
<div className="mb-6">
  <SermonHelperPanel
    sermonId={sermonId}
    sermonTitle={sermon.title}
    primaryScripture={sermon.primary_scripture}
  />
</div>
```

### Backend tRPC Routes

The UI calls these backend routes:

| Route | Phase | Purpose |
|-------|-------|---------|
| `sermonHelper.getAISuggestions` | 1 | Get AI suggestions based on sermon context |
| `sermonHelper.searchHymns` | 1 | Search hymn library |
| `sermonHelper.savePlan` | 2 | Save/update a sermon plan |
| `sermonHelper.getPlan` | 2, 9 | Retrieve saved sermon plan (used by Preach/Print in Phase 9) |
| `sermonHelper.extractPlanFromManuscript` | 6 | Import manuscript and extract structure |
| `sermonHelper.generateDraftFromPlan` | 8 | Generate preaching manuscript from plan |

See `SERMON-HELPER-BACKEND.md` for backend documentation.

## UI/UX Patterns

### Tab Navigation
- Uses existing bulletin detail page tab pattern
- Badge shows element count on Outline tab
- Smooth transitions between tabs

### Empty States
- Clear instructions when no data
- Descriptive icons (Sparkles, Music, FileText)
- Actionable prompts

### Loading States
- Spinner icons during API calls
- Disabled buttons during loading
- Progress indicators

### Error Handling
- Red alert boxes for API errors
- Descriptive error messages
- Retry suggestions

## Admin Pages

### Theology Settings Page

**Location:** `/settings/theology`
**Access:** Admin only

The Theology Settings page allows administrators to configure the church's theological profile for AI-powered sermon assistance.

**Features:**
- **Theological Identity:** Tradition selector, Bible translation, sermon style, preferred tone
- **Sensitivity & Guardrails:** Conservative/Moderate/Broad sensitivity levels
- **Restricted AI Topics:** Add/remove topics that disable AI assistance
- **Info Panel:** Explains how AI guardrails work

**UI Elements:**
- Radio button groups for sermon style and sensitivity
- Tag-style chips for restricted topics with remove buttons
- Input validation (max 20 topics, 100 chars each)
- Success/error toast messages

**Link from Settings Hub:**
The main `/settings` page includes a "Theology Profile" card linking to this page.

---

### Internal Theology QA Harness

**Location:** `/settings/theology-qa`
**Access:** Admin only (internal QA tool)

The Theology QA Harness is an internal admin tool for testing AI guardrails and suggestions without navigating to a real sermon.

**Purpose:**
- Test AI suggestions with the church's current theology profile
- Verify restricted topic blocking works correctly
- Confirm political content filtering
- Debug AI response structure and meta flags

**Left Column - Current Profile:**
- Displays the church's theology profile (read-only)
- Shows tradition, Bible translation, sermon style, sensitivity
- Lists all configured restricted topics
- Link to update profile at `/settings/theology`

**Right Column - Test Interface:**
- Input fields: Sermon ID, Theme (required), Notes (optional)
- "Get AI Suggestions" button
- Results display with:
  - **Guardrail Banners:** Amber for restricted topics, blue for political filtering
  - **Meta Badges:** Shows fallback status, tokens used, model, guardrail flags
  - **Structured Results:** Scripture, outline, applications, hymn themes in organized sections
  - **Raw JSON Toggle:** Collapsible view of full API response

**Banner Logic:**
| Banner | Condition | Message |
|--------|-----------|---------|
| Restricted Topic | `meta.restrictedTopicTriggered === true` | "AI suggestions disabled for this topic..." |
| Political Filtered | `meta.politicalContentDetected === true` | "Some content was filtered..." |

**Testing Scenarios:**
1. Normal request → Should show suggestions with tokensUsed
2. Restricted topic in theme → Should show amber banner, no suggestions
3. Political content → Should show blue banner, filtered suggestions
4. Invalid input → Should show validation errors

**Tests:** `apps/web/src/app/settings/theology-qa/__tests__/TheologyQAPage.test.ts`

---

## Preach Mode & Print View (Phase 9)

Phase 9 enables Preach Mode and Print View to render directly from `SermonPlan.elements`, providing a unified presentation experience across the sermon workflow.

### Architecture

```
apps/web/src/
├── app/sermons/[id]/
│   ├── preach/page.tsx          # Preach Mode page (fullscreen)
│   └── print/page.tsx           # Print-optimized page
├── components/sermons/
│   └── PreachMode.tsx           # Main Preach Mode component
└── lib/
    └── sermonPlanRenderer.ts    # Shared rendering logic
```

### Rendering Logic

The `sermonPlanRenderer.ts` module provides shared rendering utilities for both Preach Mode and Print View:

**Exported Functions:**

| Function | Purpose |
|----------|---------|
| `buildPreachModeBlocks()` | Converts SermonPlan to navigation blocks |
| `filterPrintableElements()` | Filters elements for print output |
| `getElementDisplayText()` | Extracts primary display text from any element |
| `getElementNote()` | Extracts secondary/note text |
| `getPointNumberInSection()` | Calculates point numbering within sections |
| `hasPlanContent()` | Checks if plan has displayable content |
| `formatSupportingTexts()` | Formats supporting texts as comma-separated list |

**Style Configurations:**

| Export | Description |
|--------|-------------|
| `PREACH_MODE_STYLES` | Font sizes, classes, dividers for each element type |
| `PRINT_STYLES` | Print-optimized styling with labels |
| `ELEMENT_COLORS` | Color scheme for element type badges (light/dark mode) |

### Preach Mode

**Location:** `/sermons/[id]/preach`

The Preach Mode provides a fullscreen, distraction-free view for delivering sermons:

**Features:**
- Block-based navigation with keyboard support (← →)
- Timer with overtime detection
- Progress indicator showing current position
- Fullscreen mode toggle
- Dark mode support
- Section headers and point numbering

**Data Priority:**
1. SermonPlan (if available)
2. Legacy `sermon.outline.mainPoints` (fallback)
3. Fallback mode (title + manuscript)

**Block Types:**

| Block Type | Content |
|------------|---------|
| `header` | Sermon title, scripture, big idea |
| `element` | Any SermonElement (section, point, scripture, etc.) |
| `conclusion` | Notes from plan or default conclusion |
| `fallback` | Basic content when no structured data |

**Element Type Icons:**

| Type | Icon | Color |
|------|------|-------|
| `section` | Heading1 | Purple |
| `point` | CircleDot | Blue |
| `scripture` | BookOpen | Amber |
| `hymn` | Music | Teal |
| `illustration` | Lightbulb | Green |
| `note` | StickyNote | Gray |

**Props:**
```typescript
interface PreachModeProps {
  sermon: {
    title: string;
    primary_scripture?: string | null;
    target_minutes?: number | null;
    manuscript?: string | null;
    outline?: { mainPoints?: any[] } | null;
  };
  onExit: () => void;
  plan?: SermonPlan | null;  // Phase 9: Optional SermonPlan
}
```

### Print View

**Location:** `/sermons/[id]/print`

The Print View provides a clean, print-optimized rendering:

**Features:**
- Respects `print.css` styling
- Point numbering within sections
- Element type labels (Scripture, Illustration, Note, Hymn)
- Supporting texts display
- Notes section in footer
- Optimized for letter-size paper

**Print Styling:**

| Element Type | Label | Style |
|--------------|-------|-------|
| `section` | *(none)* | Bold, large text |
| `point` | *(none)* | Bold with number badge |
| `scripture` | Scripture | Italic, border-left accent |
| `hymn` | Hymn | Standard font |
| `illustration` | Illustration | Gray text, indented |
| `note` | Note | Small text, indented |

**Rendering Priority:**
1. SermonPlan with `SermonPlanPrintContent` component
2. Legacy rendering from `sermon.outline.mainPoints`

### Testing

**Test Files:**

| File | Tests | Coverage |
|------|-------|----------|
| `lib/__tests__/sermonPlanRenderer.test.ts` | 64 tests | All renderer functions |
| `components/sermons/__tests__/PreachMode.logic.test.ts` | 32 tests | Block construction, navigation, SermonPlan handling |

**Test Categories:**

- Element text extraction (section, point, note, scripture, hymn, illustration)
- Block construction from SermonPlan
- Fallback behavior when plan is null or empty
- Point numbering within sections
- Style configuration completeness
- Navigation logic

**Running Tests:**
```bash
cd apps/web && npx jest --testPathPattern="sermonPlanRenderer|PreachMode.logic"
```

### Backend Integration

Both views fetch SermonPlan via tRPC:

```typescript
const { data: plan } = trpc.sermonHelper.getPlan.useQuery(
  { sermonId },
  { enabled: !!sermonId }
);
```

---

## Future Enhancements

Potential future features:
- Drag-and-drop reordering
- Undo/redo support
- Auto-save to sermon record
- Template outlines
- Scripture text preview (ESV API integration)
- Hymn lyrics preview
- Draft editing within modal (Phase 10?)
- Draft storage with version history (Phase 10?)
- Export to Word/Google Docs format
- Preach Mode gesture controls (swipe navigation)
- Print view customization options

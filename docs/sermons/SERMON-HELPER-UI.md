# Sermon Helper UI - Phase 2 Implementation

## Overview

The Sermon Helper UI provides a tabbed interface for pastors to prepare sermons with AI-assisted suggestions, hymn discovery, and outline management. This document covers the Phase 2 UI implementation.

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
    └── SermonHelperOutline.tsx        # Outline editor tab
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
- `hymns` - Thematic hymn recommendations

Each suggestion type has an "Add to Outline" button that creates appropriate `SermonElement` entries.

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

## SermonElement Type

Defined in `@elder-first/types`:

```typescript
type SermonElement =
  | { id: string; type: 'section'; title: string }
  | { id: string; type: 'point'; text: string }
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'scripture'; reference: string; note?: string }
  | { id: string; type: 'hymn'; hymnId: string; title: string; note?: string };
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
- Element creation (all 5 types)
- Element updates (partial updates, preserving other fields)
- Element deletion
- Element reordering (moveUp, moveDown, boundary conditions)
- Markdown export (all element types, ordering, edge cases)
- Type guards (discriminated union validation)

**Total Tests:** 32 tests covering all outline operations

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

The UI calls these backend routes (Phase 1):

| Route | Purpose |
|-------|---------|
| `sermonHelper.getAISuggestions` | Get AI suggestions based on sermon context |
| `sermonHelper.searchHymns` | Search hymn library |

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

## Future Enhancements

Potential Phase 3+ features:
- Drag-and-drop reordering
- Undo/redo support
- Auto-save to sermon record
- Template outlines
- Scripture text preview
- Hymn lyrics preview
- Print-optimized view

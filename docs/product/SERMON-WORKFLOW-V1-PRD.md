# Sermon Workflow V1 - Product Requirements Document

**Document Version:** 1.0
**Date:** December 2025
**Status:** Implemented
**Feature Owner:** Platform Team

---

## 1. Overview

Sermon Workflow V1 is a comprehensive sermon preparation and delivery system within the Elder-First Church Platform. It provides pastors with a structured, block-based outline builder, a distraction-free Preach Mode for live delivery, a print-optimized view for physical notes, and seamless integration with the platform's service/bulletin system. The workflow connects four key touchpoints: sermon creation in the builder, live preaching from any device, printed outlines for backup or sharing, and automatic linkage to weekly service orders.

---

## 2. Problem Statement

Pastors at small churches face significant friction in weekly sermon preparation and delivery:

- **Tool fragmentation**: Sermon notes live in Word, timing reminders in phone apps, scripture references in Bible software, and printed outlines as separate exports. Context-switching between tools wastes time and increases errors.

- **Unstructured notes**: Free-form documents make it hard to distinguish main points from illustrations, speaker notes from congregation-facing content, and timed sections from flexible material.

- **Device limitations during preaching**: Reading from paper means no timer; reading from a laptop means awkward positioning; reading from a phone means tiny text and accidental touches.

- **Last-minute scramble**: Connecting sermon content to the order of service often happens Sunday morning, leading to mismatched titles, missing scripture references, and manual data entry.

- **No graceful fallback**: If technology fails mid-sermon, there's no quick way to access a print-ready backup without pre-planning.

Sermon Workflow V1 addresses these problems by providing a single, integrated environment for the entire sermon lifecycle.

---

## 3. Goals & Non-Goals

### Goals

1. **Reduce Sunday prep friction** by enabling pastors to create, organize, and deliver sermons from one platform.

2. **Enable structured sermon notes** through a block-based outline system with distinct block types (Point, Scripture, Illustration, Note) that communicate intent and control visibility.

3. **Make preaching from a device realistic** with a purpose-built Preach Mode featuring large text, touch navigation, timer with overtime warnings, and fullscreen capability.

4. **Provide reliable print output** so pastors always have a paper backup without needing separate document formatting.

5. **Automate service integration** by linking sermons to service items and syncing key metadata (title, scripture, speaker) automatically.

6. **Maintain backward compatibility** with existing sermon data, requiring no database migrations.

### Non-Goals

- **Slide builder**: V1 does not generate presentation slides (ProPresenter, PowerPoint, etc.). The `showOnSlides` flag exists for future use but has no current output.

- **Bible commentary or study tool**: The platform does not provide verse lookups, cross-references, or exegetical resources.

- **Live streaming integration**: Sermon Workflow does not connect to streaming platforms or broadcast systems.

- **Collaborative editing**: V1 is single-user; there is no real-time co-authoring or version control.

- **AI sermon generation**: While the platform has AI features elsewhere, V1 does not auto-generate sermon content.

---

## 4. Target Users & Use Cases

### Primary Personas

| Persona | Description |
|---------|-------------|
| **Senior Pastor** | Preaches weekly, needs efficient prep workflow, values consistency, often uses tablet during delivery |
| **Associate/Youth Pastor** | Preaches periodically, may inherit sermon templates, wants quick onboarding |
| **Guest Speaker** | Occasional use, needs to create standalone sermon without deep platform knowledge |
| **Church Administrator** | Links sermons to bulletins, ensures service items are accurate, may print outlines for archives |

### Key Use Cases

1. **Weekly sermon preparation**: Pastor creates sermon during the week, building outline with main points, scriptures, and illustrations.

2. **Preaching from phone/tablet**: On Sunday, pastor opens Preach Mode, sets target time, and navigates through blocks using touch or keyboard.

3. **Printing notes**: Before or during service, pastor prints outline for pulpit backup or to share with small group leaders.

4. **Linking sermon to service**: Administrator or pastor connects sermon to the bulletin's sermon service item; metadata syncs automatically.

5. **Quick template start**: Pastor uses 3-point template to scaffold a standard structure, then customizes.

6. **Handling overtime**: During preaching, timer turns red when target time is exceeded, prompting pastor to wrap up.

7. **Fallback when no outline exists**: For manuscript-style sermons without structured points, Preach Mode displays full content in scrollable view.

---

## 5. User Stories

| ID | User Story |
|----|------------|
| US-01 | As a pastor, I want to create a new sermon with title, date, scripture, and preacher fields, so that I have a basic record before building the outline. |
| US-02 | As a pastor, I want to add blocks to my outline with different types (Point, Scripture, Illustration, Note), so that I can distinguish the purpose of each section. |
| US-03 | As a pastor, I want to use a 3-point template to quickly scaffold a standard sermon structure, so that I don't start from scratch every week. |
| US-04 | As a pastor, I want to reorder blocks by dragging them, so that I can adjust the flow of my sermon easily. |
| US-05 | As a pastor, I want to mark certain blocks as excluded from print, so that my personal speaker notes don't appear on printed outlines. |
| US-06 | As a pastor, I want to enter Preach Mode and see my outline in large, readable text, so that I can preach from my phone or tablet. |
| US-07 | As a pastor, I want to navigate between blocks by tapping the left or right side of the screen, so that I can advance without precise button targeting. |
| US-08 | As a pastor, I want to set a target sermon time and see a timer that turns red when I go over, so that I can manage my pacing. |
| US-09 | As a pastor, I want to toggle fullscreen mode in Preach Mode, so that I eliminate distractions during delivery. |
| US-10 | As a pastor, I want to print my sermon outline with proper formatting for each block type, so that I have a paper backup. |
| US-11 | As a pastor, I want my sermon's title, scripture, and speaker to sync to the linked service item, so that the bulletin is accurate without manual re-entry. |
| US-12 | As an administrator, I want to access Preach Mode and Print directly from the service items list, so that I can help the pastor quickly on Sunday morning. |
| US-13 | As a pastor, I want Preach Mode to work even if my network drops mid-sermon, so that I'm not stranded if WiFi fails. |
| US-14 | As a guest speaker, I want to create a sermon without needing to link it to a service, so that I can use Preach Mode standalone. |
| US-15 | As a pastor, I want block types to have distinct visual styling in Preach Mode, so that I can quickly identify scriptures vs. illustrations vs. notes at a glance. |

---

## 6. Functional Requirements

### 6.1 Sermon Builder / Outline / Blocks

| ID | Requirement |
|----|-------------|
| FR-1.1 | A sermon outline consists of an ordered array of blocks, each with a required `label` field and optional `scriptureRef`, `summary`, and `notes` fields. |
| FR-1.2 | Each block has an optional `type` field with allowed values: `POINT`, `SCRIPTURE`, `ILLUSTRATION`, `NOTE`. If not set, the block defaults to `POINT`. |
| FR-1.3 | Each block has optional boolean flags: `showOnSlides` and `includeInPrint`. Defaults are determined by block type via `getBlockDefaults()`. |
| FR-1.4 | The builder provides a block type selector (dropdown) for each block, with color-coded badges indicating the selected type. |
| FR-1.5 | The builder provides toggle switches for `showOnSlides` and `includeInPrint` on each block. |
| FR-1.6 | The builder provides a "3-Point Template" button that inserts a predefined structure: Introduction (NOTE), Point 1-3 (POINT), Application (NOTE), Conclusion (NOTE). |
| FR-1.7 | If blocks already exist, the template button prompts for confirmation before replacing content. |
| FR-1.8 | Block labels and placeholders adapt based on block type (e.g., "Scripture Title/Reference" for SCRIPTURE, "Illustration Title" for ILLUSTRATION). |
| FR-1.9 | Blocks can be reordered via drag-and-drop. |
| FR-1.10 | Blocks can be deleted individually. |
| FR-1.11 | The builder header includes a "Print" button linking to the print view. |

### 6.2 Preach Mode

| ID | Requirement |
|----|-------------|
| FR-2.1 | Preach Mode is accessible at `/sermons/[id]/preach`. |
| FR-2.2 | Preach Mode displays one block at a time with large, readable text. |
| FR-2.3 | Users can navigate to the next block by tapping the right third of the screen, pressing Right Arrow, Space, or Page Down. |
| FR-2.4 | Users can navigate to the previous block by tapping the left third of the screen, pressing Left Arrow, or Page Up. |
| FR-2.5 | Navigation is disabled at boundaries (cannot go previous from first block, cannot go next from last block). |
| FR-2.6 | A progress indicator shows current position (e.g., "3 / 8"). |
| FR-2.7 | A timer displays elapsed time since Preach Mode was opened. |
| FR-2.8 | Users can set a target time (in minutes) via a settings panel. |
| FR-2.9 | When elapsed time exceeds target time, the timer background turns red and displays overtime duration (e.g., "+2:30 over"). |
| FR-2.10 | Block styling varies by type: POINT is bold/prominent, SCRIPTURE is italic with accent, ILLUSTRATION is medium weight, NOTE is muted/smaller. |
| FR-2.11 | Each block type displays an appropriate icon indicator. |
| FR-2.12 | Users can toggle fullscreen mode via button or "F" key. |
| FR-2.13 | Pressing Escape closes settings panel first, then exits fullscreen, then exits Preach Mode. |
| FR-2.14 | If the sermon has no `mainPoints`, Preach Mode displays a fallback view with title, scripture, big idea, manuscript, application, and call to action in a scrollable format. |
| FR-2.15 | Sermon data is loaded once at mount; Preach Mode does not poll or refetch during delivery. |
| FR-2.16 | Theme toggle (dark/light) is available. |
| FR-2.17 | Font size adjustment is available. |

### 6.3 Print View

| ID | Requirement |
|----|-------------|
| FR-3.1 | Print view is accessible at `/sermons/[id]/print`. |
| FR-3.2 | Only blocks where `includeInPrint` resolves to `true` (explicit or default) are displayed. |
| FR-3.3 | The header section displays: sermon title, preacher name, sermon date (formatted), primary scripture, and big idea (if present). |
| FR-3.4 | POINT blocks are displayed with sequential numbering and bold styling. |
| FR-3.5 | SCRIPTURE blocks are displayed with italic styling and a visual accent (e.g., border). |
| FR-3.6 | ILLUSTRATION and NOTE blocks are displayed with distinct but readable styling. |
| FR-3.7 | Each block shows its label, scripture reference (if present), summary (if present), and notes (if present). |
| FR-3.8 | The footer section displays application and call to action (if present). |
| FR-3.9 | A "Print" button triggers `window.print()`. |
| FR-3.10 | A "Back" button returns to the previous page. |
| FR-3.11 | Print-specific CSS ensures proper page margins, font sizes, and page break handling. |
| FR-3.12 | Navigation elements are hidden when printing. |

### 6.4 Service/Bulletin Integration

| ID | Requirement |
|----|-------------|
| FR-4.1 | A service item can link to a sermon via `sermon_id`. |
| FR-4.2 | When a sermon is linked and marked ready (via `setReadyAndSync`), the following fields sync: `sermon.title` → `service_item.title`, `sermon.primary_scripture` → `service_item.scripture_ref`, `sermon.preacher` → `service_item.speaker`. |
| FR-4.3 | The sermon detail page displays "Preach Mode" and "Print Outline" buttons. |
| FR-4.4 | The service items list displays "Preach" and "Print" quick-access links for items with a linked sermon. |
| FR-4.5 | Quick-access links navigate to `/sermons/[sermon_id]/preach` and `/sermons/[sermon_id]/print` respectively. |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | **Performance**: Preach Mode must render and be interactive within 2 seconds on a mid-range mobile device over 4G. |
| NFR-2 | **Reliability**: Preach Mode must function without network connectivity after initial load (no polling, no refetching). |
| NFR-3 | **Usability - Mobile**: Preach Mode tap zones must be large enough for reliable touch navigation on phones and tablets. |
| NFR-4 | **Usability - Readability**: Default font sizes in Preach Mode must be readable from 3-4 feet away on a tablet. |
| NFR-5 | **Print Quality**: Printed output must be legible and well-formatted on standard US Letter paper. |
| NFR-6 | **Backward Compatibility**: Existing sermons without new type/flag fields must continue to function correctly, with blocks defaulting to POINT behavior. |
| NFR-7 | **Accessibility**: Preach Mode must support keyboard navigation as an alternative to touch. |

---

## 8. Data Model & Integration Notes

### Sermon Outline Structure

The sermon outline is stored in the existing `outline` JSONB column on the `sermon` table. The structure is:

```
SermonOutline {
  bigIdea?: string
  mainPoints?: SermonOutlinePoint[]
  application?: string
  callToAction?: string
  extraNotes?: string
}

SermonOutlinePoint {
  label: string (required, min 1 char)
  scriptureRef?: string
  summary?: string
  notes?: string
  type?: "POINT" | "SCRIPTURE" | "ILLUSTRATION" | "NOTE"
  showOnSlides?: boolean
  includeInPrint?: boolean
}
```

### Helper Functions

- `getEffectiveBlockType(type)`: Returns the type or defaults to `"POINT"` if undefined.
- `getBlockDefaults(type)`: Returns default flag values based on type:
  - POINT/SCRIPTURE: `{ showOnSlides: true, includeInPrint: true }`
  - ILLUSTRATION/NOTE: `{ showOnSlides: false, includeInPrint: true }`

### Service Item Relationship

- `service_item.sermon_id` is a foreign key to `sermon.id`.
- `setReadyAndSync()` procedure syncs metadata when a sermon is marked ready.
- The relationship is optional; sermons can exist without service item linkage.

---

## 9. Constraints & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| **JSONB-based storage, no migration** | New fields are optional within existing JSONB column, avoiding schema changes and ensuring zero-downtime deployment. Tradeoff: cannot query/index individual block properties at the database level. |
| **Browser-based print** | Uses `window.print()` rather than server-side PDF generation. Simpler implementation, no additional dependencies. Tradeoff: less control over exact PDF output, relies on browser print dialog. |
| **Single load in Preach Mode** | Sermon is fetched once at mount with no subsequent polling. Ensures stability if network drops mid-sermon. Tradeoff: edits made elsewhere won't appear until Preach Mode is reopened. |
| **`showOnSlides` flag without current use** | Flag exists in schema for future slide export feature. Tradeoff: slight over-engineering, but avoids future migration. |
| **Tap zones for navigation** | Left/right thirds of screen for prev/next. Optimized for one-handed mobile use. Tradeoff: center area is smaller for content interaction (scrolling). |
| **Fallback mode for unstructured sermons** | If `mainPoints` is empty, displays manuscript/big idea. Ensures all sermons work in Preach Mode. Tradeoff: less structured experience for manuscript-style preachers. |

---

## 10. Acceptance Criteria

For Sermon Workflow V1 to be considered complete, the following must be true:

### Sermon Builder
- [ ] Blocks can be created with all four types (POINT, SCRIPTURE, ILLUSTRATION, NOTE)
- [ ] Block type can be changed after creation
- [ ] Flag toggles work and persist
- [ ] 3-Point Template inserts correct structure
- [ ] Blocks can be reordered and deleted
- [ ] Legacy sermons without type fields display and edit correctly

### Preach Mode
- [ ] Displays blocks one at a time with correct styling per type
- [ ] Touch navigation works (left tap = prev, right tap = next)
- [ ] Keyboard navigation works (arrows, space, page up/down)
- [ ] Timer displays elapsed time
- [ ] Overtime indicator appears when target exceeded
- [ ] Fullscreen toggle works (button and F key)
- [ ] Fallback mode displays when no mainPoints exist
- [ ] Functions without network after initial load

### Print View
- [ ] Only blocks with `includeInPrint=true` (or default true) appear
- [ ] Block types have distinct styling
- [ ] Header shows title, preacher, date, scripture, big idea
- [ ] Footer shows application and call to action
- [ ] Print button triggers browser print dialog
- [ ] Output is properly formatted for Letter paper

### Integration
- [ ] Sermon detail page has working Preach Mode and Print buttons
- [ ] Service items list shows Preach and Print links for linked sermons
- [ ] Links navigate to correct routes

---

## 11. Risks & Open Questions

### Risks

| Risk | Mitigation |
|------|------------|
| **Manuscript-preferring pastors may not adopt** | Fallback mode ensures they can still use Preach Mode; print view works regardless of structure level. |
| **Very long outlines may be hard to navigate** | Progress indicator helps; future versions could add outline overview/jump. |
| **Print layout may vary by browser** | Basic print CSS is applied; tested on Chrome/Edge. May need refinement for Safari/Firefox edge cases. |
| **Overtime indicator may be distracting** | It's non-intrusive (color change only, no audio/popup). Users can ignore target time feature. |

### Open Questions

- Should there be a "presenter notes" field separate from block notes that never prints?
- How should very long scripture blocks be handled in Preach Mode (scroll vs. truncate)?
- Would pastors benefit from seeing an outline thumbnail/overview in Preach Mode?
- Should print view support multiple paper sizes (A4, Letter)?

---

## 12. Future Enhancements

The following are potential enhancements for V1.1 or V2, not designed in detail:

- **Slide export**: Generate slides from blocks where `showOnSlides=true` (ProPresenter, PowerPoint, Google Slides)
- **Additional templates**: Topical, expository, narrative sermon templates
- **Series-level workflow**: Manage sermon series with shared themes, scripture arcs, and scheduling
- **Outline overview in Preach Mode**: Thumbnail or list view to jump to specific blocks
- **Server-side PDF generation**: Higher-fidelity print output with consistent formatting
- **Preaching analytics**: Track sermon duration over time, most-used scriptures, etc.
- **Shared outlines**: Export/import outlines for guest speakers or multi-campus use
- **Timer presets**: Save common target times per sermon type (Sunday AM, Wednesday PM, etc.)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2025 | Platform Team | Initial PRD documenting implemented V1 features |

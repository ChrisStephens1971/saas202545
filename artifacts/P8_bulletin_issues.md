# Bulletin Generator - Task Breakdown

**Feature:** Elder-First Church Platform Bulletin Generator
**Epic Owner:** Product Lead
**Sprint Target:** Sprints 2-4 (6-8 weeks)
**Dependencies:** P3 (Schema), P5 (API), P6 (Wireframes)

---

## Overview

The Bulletin Generator is the **hero feature** of the Elder-First platform. It transforms a single intake form into 6 production-ready outputs:
1. Standard PDF bulletin
2. Large-print PDF (120% scaled)
3. Presentation slides (JPG set, 1920x1080)
4. Loop video (MP4, 10sec per slide)
5. Email HTML (inline styles)
6. ProPresenter 7 bundle (slides + service plan)

**One Form or It Doesn't Happen:** All content flows through a single intake form. No exceptions.

---

## Architecture

```
┌─────────────┐
│   Intake    │  3 tabs: Service Plan, Announcements, Branding
│    Form     │  Validation: CCLI, char limits, image size
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Template   │  EJS/Handlebars templates with locked tokens
│   Engine    │  Blocks: Cover, Welcome, Songs, Sermon, etc.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Render    │  Playwright headless browser
│   Service   │  HTML → PDF/JPG/MP4
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Output    │  6 artifacts uploaded to Azure Blob + CDN
│  Pipeline   │  Versioned, immutable after lock
└─────────────┘
```

**State Machine:**
```
draft → approved → built → locked
                              ↓
                       reopen_emergency
                              ↓
                           locked*
           (* watermarked "UPDATED [timestamp]")
```

---

## Task List

### Epic 1: Data Model & Validations

#### BG-001: Extend Database Schema for Bulletin State
**Priority:** P0 (Blocker)
**Effort:** 2 points (1 day)
**Dependencies:** P3 (Schema complete)

**Description:**
Verify and test the bulletin_issue, service_item, announcement, brand_pack tables with RLS policies.

**Acceptance Criteria:**
- [ ] `bulletin_issue` table supports all 6 artifact URLs
- [ ] Status enum includes: draft, approved, built, locked
- [ ] `content_hash` field for immutability verification
- [ ] `reopened_at`, `reopened_by`, `reopen_reason` fields present
- [ ] RLS policies tested with different tenant contexts
- [ ] Unique constraint on (tenant_id, issue_date)

**SQL Validation:**
```sql
-- Test state transitions
UPDATE bulletin_issue SET status = 'approved' WHERE id = '...';
-- Verify RLS isolation
SET app.tenant_id = 'tenant-1-uuid';
SELECT * FROM bulletin_issue; -- Should only see tenant 1 data
```

---

#### BG-002: Backend Validation Service
**Priority:** P0 (Blocker)
**Effort:** 3 points (2 days)
**Dependencies:** BG-001, P5 (API routers)

**Description:**
Create BulletinValidator service to enforce business rules before state transitions.

**Acceptance Criteria:**
- [ ] Validate all songs have CCLI numbers before build
- [ ] Validate announcement character limits (title ≤60, body ≤300)
- [ ] Validate at least 1 announcement selected
- [ ] Validate service date ≥ today
- [ ] Validate brand pack assigned
- [ ] Return detailed error report with line numbers/field names
- [ ] Unit tests for each validation rule

**TypeScript Interface:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

**Example:**
```typescript
const result = await BulletinValidator.validateForBuild(issueId);
// Returns: { valid: false, errors: [{ field: 'service_items[2].ccli_number', message: 'CCLI required for songs', severity: 'error' }] }
```

---

### Epic 2: Intake Form UI

#### BG-003: Service Plan Tab (Calendar View)
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** P6 (Wireframes), BG-002 (Validation)

**Description:**
Build the Service Plan tab with drag-and-drop order of worship builder.

**Acceptance Criteria:**
- [ ] Display service items in sequence order
- [ ] Drag-and-drop reordering (update sequence)
- [ ] Add/edit/delete service items
- [ ] Type selector (Welcome, Song, Prayer, etc.)
- [ ] CCLI number field for songs (validated)
- [ ] Live validation: show ❌ for missing CCLI
- [ ] Import ICS calendar button (future: parse events)
- [ ] Import Planning Center CSV button (future: parse service items)
- [ ] Auto-save on blur (debounced)
- [ ] Keyboard accessible (Tab, Enter, Arrows for reorder)

**Components:**
- `ServicePlanTab.tsx`
- `ServiceItemCard.tsx`
- `ServiceItemForm.tsx`
- `DragDropContext` (react-beautiful-dnd or dnd-kit)

**tRPC Mutations:**
- `services.upsertItems()`
- `services.enforceCCLI()`

---

#### BG-004: Announcements Tab (Selection & Ordering)
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** P6 (Wireframes), BG-002 (Validation)

**Description:**
Build the Announcements tab with checkbox selection and reordering.

**Acceptance Criteria:**
- [ ] Fetch all active announcements (not expired)
- [ ] Checkbox to include/exclude in bulletin
- [ ] Reorder selected announcements (drag-and-drop or arrows)
- [ ] Live character counter (60/60 title, 300/300 body)
- [ ] Visual separator: "Top 3" vs. "Two-Column Grid"
- [ ] Max 10 announcements selectable
- [ ] Priority badges (🔴 Urgent, ⚠️ High, 📌 Normal)
- [ ] Create new announcement inline (opens modal)
- [ ] Auto-save selections

**Components:**
- `AnnouncementsTab.tsx`
- `AnnouncementSelector.tsx`
- `AnnouncementCard.tsx`
- `CreateAnnouncementModal.tsx`

**tRPC Queries/Mutations:**
- `announcements.listActive()`
- `announcements.create()`
- `bulletin.updateAnnouncementSelection()`

---

#### BG-005: Branding Tab (Brand Pack Selector)
**Priority:** P1 (High)
**Effort:** 3 points (2 days)
**Dependencies:** P6 (Wireframes)

**Description:**
Build the Branding tab with brand pack selector and cover image uploader.

**Acceptance Criteria:**
- [ ] Dropdown to select brand pack
- [ ] Live preview of selected brand (logo, colors, fonts, contact info)
- [ ] Upload cover image (max 4MB, 16:9 recommended)
- [ ] Image validation: file size, format (jpg/png)
- [ ] Auto-crop/resize to 1920x1080
- [ ] Preview cover image on bulletin mockup
- [ ] Option to remove cover image
- [ ] "Manage Brand Packs" link to settings
- [ ] Auto-save brand pack assignment

**Components:**
- `BrandingTab.tsx`
- `BrandPackSelector.tsx`
- `CoverImageUploader.tsx`
- `BrandPreview.tsx`

**tRPC Queries/Mutations:**
- `brandpack.getActive()`
- `bulletin.updateBrandPack(issueId, brandPackId)`

**Azure Blob Upload:**
- Upload cover image to `{tenant}/bulletins/{issueId}/cover.jpg`
- Return CDN URL

---

#### BG-006: Intake Form Layout & Navigation
**Priority:** P0 (Blocker)
**Effort:** 3 points (2 days)
**Dependencies:** BG-003, BG-004, BG-005

**Description:**
Integrate the 3 tabs into a cohesive intake form with navigation, auto-save, and validation feedback.

**Acceptance Criteria:**
- [ ] Tab navigation (Service Plan, Announcements, Branding)
- [ ] Progress indicator (which tabs are complete)
- [ ] "Save Draft" button (manual save + auto-save on blur)
- [ ] "Next" button to proceed to Preview
- [ ] Validation warnings at tab level (e.g., "1 song missing CCLI")
- [ ] Breadcrumb: Back to Bulletins
- [ ] Status badge: Draft, Approved, Built, Locked
- [ ] Keyboard navigation (Ctrl+S to save, Ctrl+→ next tab)

**Components:**
- `IntakeFormLayout.tsx`
- `TabNavigation.tsx`
- `ValidationSummary.tsx`

**Route:** `/bulletins/:id/intake`

---

### Epic 3: Template Engine

#### BG-007: Define Template Blocks
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** P6 (Wireframes), P9 (Template files)

**Description:**
Create EJS/Handlebars templates for each bulletin section with locked layout tokens.

**Template Blocks:**
1. **Cover** - Logo, church name, service date, cover image
2. **Welcome** - Pastor's welcome message
3. **Order of Service** - List of service items (numbered)
4. **Songs** - Lyrics with CCLI footer
5. **Scripture** - Formatted scripture text
6. **Sermon Notes** - Title, speaker, outline (bulleted)
7. **Announcements Grid** - Top 3 large, rest two-column
8. **Mini Calendar** - Next 7 days events
9. **Giving/Prayer QR** - QR codes for online giving and prayer requests
10. **Footer** - Contact info, website, social media

**Acceptance Criteria:**
- [ ] Each block is a separate .ejs file
- [ ] Blocks accept data objects (typed interfaces)
- [ ] CSS tokens for spacing, typography, colors
- [ ] Line-clamp utilities for truncation (ellipsis)
- [ ] Widow/orphan prevention CSS
- [ ] Large-print variant (120% scale, no layout changes)
- [ ] Print-safe styles (@media print)
- [ ] CMYK-safe color palette documented

**Files:**
- `templates/cover.ejs`
- `templates/welcome.ejs`
- `templates/order-of-service.ejs`
- `templates/songs.ejs`
- `templates/sermon.ejs`
- `templates/announcements.ejs`
- `templates/calendar.ejs`
- `templates/footer.ejs`
- `styles/tokens.css`

**Example:**
```ejs
<!-- templates/songs.ejs -->
<div class="song-block">
  <h3 class="song-title"><%= song.title %></h3>
  <p class="song-artist">by <%= song.artist %></p>
  <div class="song-lyrics">
    <%= song.content %>
  </div>
  <footer class="song-footer">
    CCLI License #<%= song.ccli_number %>
  </footer>
</div>
```

---

#### BG-008: Bulletin Layout Engine (Single Sheet)
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** BG-007

**Description:**
Assemble template blocks into a single-sheet 8.5x11" bulletin layout.

**Acceptance Criteria:**
- [ ] Letter-size (8.5 x 11 inches) portrait layout
- [ ] Blocks flow in order: Cover → Welcome → Service → Songs → Announcements → Footer
- [ ] Page breaks where appropriate
- [ ] Typography: min 11pt body, 14pt headings
- [ ] Margins: 0.5" all sides
- [ ] Headers/footers with page numbers
- [ ] Overflow handling: truncate with "See website for full details" + QR code
- [ ] Render to HTML (Next.js SSR)

**Files:**
- `lib/bulletin-renderer.ts`
- `templates/layouts/single-sheet.ejs`

**Function:**
```typescript
async function renderBulletinHTML(issueId: string): Promise<string> {
  const data = await fetchBulletinData(issueId);
  const html = await ejs.render(singleSheetTemplate, data);
  return html;
}
```

---

#### BG-009: Half-Letter Booklet Layout + Imposition
**Priority:** P1 (High)
**Effort:** 8 points (5 days)
**Dependencies:** BG-008

**Description:**
Create half-letter booklet layout (5.5 x 8.5") with correct page imposition for printing.

**Imposition Logic:**
- **Sheet 1 (outside):** Page 4 (left), Page 1 (right)
- **Sheet 1 (inside):** Page 2 (left), Page 3 (right)
- Fold in half, staple spine

**Acceptance Criteria:**
- [ ] Half-letter size (5.5 x 8.5 inches)
- [ ] 4-page layout: Cover → Inside Left → Inside Right → Back
- [ ] Imposition: Page order 4-1, 2-3 for duplex printing
- [ ] Spine gutter: extra 0.25" margin on inside edges
- [ ] Bleed marks for professional printing (optional)
- [ ] PDF output with correct page ordering
- [ ] Test print folds correctly when stapled

**Files:**
- `templates/layouts/half-letter-booklet.ejs`
- `lib/imposition.ts`

**Function:**
```typescript
async function renderBookletPDF(issueId: string): Promise<Buffer> {
  const pages = await renderBookletPages(issueId);
  const imposed = imposePages(pages); // [4, 1, 2, 3]
  const pdf = await renderPDF(imposed);
  return pdf;
}
```

---

### Epic 4: Render Pipeline

#### BG-010: Playwright Render Service (PDF)
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** BG-008, P10 (Renderer service scaffold)

**Description:**
Set up Playwright headless browser to render HTML → PDF with print styles.

**Acceptance Criteria:**
- [ ] Playwright installed and configured
- [ ] Headless Chromium (or Firefox for PDF/A compliance)
- [ ] Function: `renderPDF(html, options)` → PDF Buffer
- [ ] Print CSS applied (@media print)
- [ ] Font embedding (embed web fonts in PDF)
- [ ] Deterministic viewport (1280x720 for consistency)
- [ ] CMYK color conversion tips documented
- [ ] PDF metadata (title, author, creation date)
- [ ] Error handling: timeout, OOM, render failures
- [ ] Retry logic (3 attempts with exponential backoff)

**Files:**
- `services/render/pdf-renderer.ts`
- `services/render/playwright-setup.ts`

**Function:**
```typescript
async function renderPDF(html: string, options: PDFOptions): Promise<Buffer> {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(html);
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
  });
  await browser.close();
  return pdf;
}
```

---

#### BG-011: Render Service (Slides - JPG Set)
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** BG-010

**Description:**
Generate presentation slides as 1920x1080 JPG images for projection screens.

**Slide Breakdown:**
1. Cover slide (church logo + service date)
2. Welcome slide
3-6. Song slides (one per song, lyrics)
7. Sermon title slide
8. Offering/Communion slide
9-11. Announcement slides (top 3 featured)
12. Closing/contact slide

**Acceptance Criteria:**
- [ ] Function: `renderSlides(html, options)` → Array<Buffer>
- [ ] Resolution: 1920x1080 (16:9)
- [ ] Format: JPG, quality 85%
- [ ] Each block becomes a slide
- [ ] Backgrounds: solid color or cover image
- [ ] Text: large, high contrast (white on dark for readability)
- [ ] Lyrics: centered, max 4 lines per slide
- [ ] Upload each slide to Blob Storage
- [ ] Return array of CDN URLs

**Files:**
- `services/render/slides-renderer.ts`

**Function:**
```typescript
async function renderSlides(issueId: string): Promise<string[]> {
  const blocks = await generateSlideBlocks(issueId);
  const slideUrls: string[] = [];

  for (const [index, block] of blocks.entries()) {
    const html = await renderSlideHTML(block);
    const screenshot = await page.screenshot({ fullPage: true });
    const url = await uploadToBlob(screenshot, `slide-${index + 1}.jpg`);
    slideUrls.push(url);
  }

  return slideUrls;
}
```

---

#### BG-012: Render Service (Loop Video - MP4)
**Priority:** P1 (High)
**Effort:** 5 points (3 days)
**Dependencies:** BG-011 (Slides)

**Description:**
Stitch slide JPGs into a looping MP4 video (10 seconds per slide) for pre-service display.

**Acceptance Criteria:**
- [ ] Input: Array of slide JPG URLs
- [ ] Function: `renderLoopVideo(slideUrls)` → MP4 Buffer
- [ ] Duration: 10 seconds per slide
- [ ] Transition: crossfade (1 second)
- [ ] Resolution: 1920x1080
- [ ] Codec: H.264, 30fps
- [ ] Looping: set metadata for seamless loop
- [ ] Audio: optional background music (future)
- [ ] Upload to Blob Storage
- [ ] Return CDN URL

**Tools:**
- FFmpeg via `fluent-ffmpeg` npm package
- OR cloud transcoder (Azure Media Services)

**Files:**
- `services/render/video-renderer.ts`

**Function:**
```typescript
async function renderLoopVideo(slideUrls: string[]): Promise<string> {
  const tempDir = await downloadSlides(slideUrls);
  const videoPath = path.join(tempDir, 'loop.mp4');

  await ffmpeg()
    .input(`${tempDir}/slide-%d.jpg`)
    .inputFPS(1/10) // 10 sec per slide
    .outputOptions([
      '-vf', 'fade=t=in:st=0:d=1,fade=t=out:st=9:d=1', // Crossfade
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30'
    ])
    .save(videoPath);

  const url = await uploadToBlob(videoPath, 'loop.mp4');
  return url;
}
```

---

#### BG-013: Render Service (Email HTML)
**Priority:** P1 (High)
**Effort:** 3 points (2 days)
**Dependencies:** BG-008

**Description:**
Generate email-friendly HTML with inlined styles and optimized images.

**Acceptance Criteria:**
- [ ] Function: `renderEmailHTML(html)` → HTML string
- [ ] Inline all CSS (no external stylesheets)
- [ ] Table-based layout (for Outlook compatibility)
- [ ] Images uploaded to CDN (no base64 embeds)
- [ ] Alt text on all images
- [ ] Max width: 600px
- [ ] Dark mode support (@media prefers-color-scheme)
- [ ] Preheader text (hidden preview text)
- [ ] Unsubscribe link placeholder
- [ ] Test rendering: Litmus or Email on Acid

**Tools:**
- `juice` npm package (inline CSS)
- Responsive email templates

**Files:**
- `services/render/email-renderer.ts`
- `templates/email/bulletin-email.ejs`

**Function:**
```typescript
async function renderEmailHTML(issueId: string): Promise<string> {
  const data = await fetchBulletinData(issueId);
  const html = await ejs.render(emailTemplate, data);
  const inlined = juice(html); // Inline CSS
  return inlined;
}
```

---

#### BG-014: ProPresenter 7 Bundle Export
**Priority:** P2 (Medium)
**Effort:** 5 points (3 days)
**Dependencies:** BG-011 (Slides)

**Description:**
Generate a ProPresenter 7-compatible bundle (.zip) with slides and service plan.

**ProPresenter Bundle Structure:**
```
propresenter-2025-11-17.zip
├── slides/
│   ├── 01-cover.jpg
│   ├── 02-welcome.jpg
│   ├── 03-song-1.jpg
│   └── ...
├── playlist.pro6
└── metadata.json
```

**Acceptance Criteria:**
- [ ] Export slides as numbered JPGs
- [ ] Generate `.pro6` playlist file (XML format)
- [ ] Include service plan order
- [ ] Slide timings (default 10 seconds)
- [ ] Metadata: church name, service date, created by
- [ ] Zip all files
- [ ] Upload to Blob Storage
- [ ] Return CDN URL

**Files:**
- `services/render/propresenter-exporter.ts`
- `templates/propresenter/playlist.xml.ejs`

**Function:**
```typescript
async function exportProPresenterBundle(issueId: string): Promise<string> {
  const slideUrls = await getSlideUrls(issueId);
  const servicePlan = await getServicePlan(issueId);

  const zip = new JSZip();

  // Add slides
  for (const [index, url] of slideUrls.entries()) {
    const image = await fetch(url).then(r => r.buffer());
    zip.file(`slides/${String(index + 1).padStart(2, '0')}-slide.jpg`, image);
  }

  // Add playlist
  const playlist = await renderProPresenterPlaylist(servicePlan);
  zip.file('playlist.pro6', playlist);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const url = await uploadToBlob(zipBuffer, 'propresenter-bundle.zip');
  return url;
}
```

---

#### BG-015: Large Print Variant (120% Scale)
**Priority:** P1 (High)
**Effort:** 2 points (1 day)
**Dependencies:** BG-010 (PDF renderer)

**Description:**
Generate a large-print version of the bulletin by scaling the entire layout by 120%.

**Acceptance Criteria:**
- [ ] Same template, 120% scale applied
- [ ] CSS transform: `scale(1.2)`
- [ ] Viewport adjusted to compensate
- [ ] No layout changes (just bigger text/images)
- [ ] Function: `renderLargePrintPDF(issueId)` → PDF Buffer
- [ ] Upload to Blob Storage as `bulletin-{date}-large.pdf`
- [ ] Return CDN URL

**Files:**
- `services/render/large-print-renderer.ts`

**Function:**
```typescript
async function renderLargePrintPDF(issueId: string): Promise<string> {
  const html = await renderBulletinHTML(issueId);
  const scaledHTML = wrapWithScale(html, 1.2);
  const pdf = await renderPDF(scaledHTML, { viewport: { width: 1536, height: 864 } });
  const url = await uploadToBlob(pdf, `bulletin-${date}-large.pdf`);
  return url;
}
```

---

### Epic 5: Locking & State Management

#### BG-016: State Machine Implementation
**Priority:** P0 (Blocker)
**Effort:** 5 points (3 days)
**Dependencies:** BG-002 (Validation), P11 (Audit triggers)

**Description:**
Implement server-side state machine for bulletin lifecycle: draft → approved → built → locked.

**State Transitions:**
- **draft → approved:** Editor+ can approve (manual step, optional)
- **approved → built:** Trigger render pipeline (preview with PROOF watermark)
- **built → locked:** Admin-only, validates pre-lock checklist, renders final artifacts
- **locked → draft:** Emergency reopen (Admin-only, logs reason, adds timestamp watermark)

**Acceptance Criteria:**
- [ ] State transitions enforced server-side (tRPC mutations)
- [ ] Validate pre-conditions before transition
- [ ] Atomic updates (transaction)
- [ ] Audit log entry for each transition
- [ ] Webhooks/notifications on state change (future)
- [ ] Lock immutability: prevent edits after lock
- [ ] Emergency reopen: require reason (min 10 chars)

**Files:**
- `services/bulletin-state-machine.ts`

**Function:**
```typescript
async function transitionState(
  issueId: string,
  fromState: BulletinStatus,
  toState: BulletinStatus,
  userId: string
): Promise<void> {
  // Validate transition is allowed
  if (!isValidTransition(fromState, toState)) {
    throw new Error(`Invalid transition: ${fromState} → ${toState}`);
  }

  // Validate pre-conditions
  if (toState === 'built') {
    await BulletinValidator.validateForBuild(issueId);
  }

  if (toState === 'locked') {
    await BulletinValidator.validateForLock(issueId);
  }

  // Update status
  await db.bulletin_issue.update({
    where: { id: issueId },
    data: { status: toState },
  });

  // Audit log
  await db.audit_log.create({
    data: {
      action: `bulletin.transition.${fromState}_to_${toState}`,
      user_id: userId,
      resource_id: issueId,
    },
  });
}
```

---

#### BG-017: Watermarking (PROOF vs. Final)
**Priority:** P0 (Blocker)
**Effort:** 2 points (1 day)
**Dependencies:** BG-010 (PDF renderer)

**Description:**
Add watermark overlay to preview PDFs (before lock) and emergency reopened bulletins.

**Watermark Types:**
1. **PROOF (diagonal, 50% opacity)** - For previews (status = 'built')
2. **UPDATED [timestamp] (footer)** - For emergency reopened bulletins

**Acceptance Criteria:**
- [ ] PROOF watermark: diagonal text, 72pt, gray, 50% opacity
- [ ] Position: center of each page
- [ ] Rotation: -45 degrees
- [ ] UPDATED watermark: footer, small text, red
- [ ] Format: "UPDATED Nov 14, 2025 3:45 PM"
- [ ] Watermarks removed when status = 'locked' (and not reopened)
- [ ] Apply watermark in PDF render step

**Files:**
- `services/render/watermark.ts`

**CSS:**
```css
.watermark-proof {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 72pt;
  color: rgba(0, 0, 0, 0.1);
  pointer-events: none;
  z-index: 9999;
}
```

---

#### BG-018: Content Hash & Immutability
**Priority:** P1 (High)
**Effort:** 3 points (2 days)
**Dependencies:** BG-016 (State machine)

**Description:**
Generate SHA-256 hash of bulletin content + template at lock time to prevent tampering.

**Acceptance Criteria:**
- [ ] Hash inputs: service items, announcements, brand pack, template version
- [ ] Function: `generateContentHash(issueId)` → sha256 string
- [ ] Store hash in `bulletin_issue.content_hash` on lock
- [ ] Verify hash when downloading artifacts
- [ ] Warn if hash mismatch (content may have been modified)
- [ ] Immutability: prevent updates to locked bulletins (database constraint + app logic)

**Files:**
- `services/bulletin-hash.ts`

**Function:**
```typescript
async function generateContentHash(issueId: string): Promise<string> {
  const data = await fetchBulletinData(issueId);
  const input = JSON.stringify({
    serviceItems: data.serviceItems,
    announcements: data.announcements,
    brandPack: data.brandPack,
    templateVersion: '1.0',
  });

  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return `sha256:${hash}`;
}
```

---

#### BG-019: Emergency Reopen Flow
**Priority:** P1 (High)
**Effort:** 3 points (2 days)
**Dependencies:** BG-016 (State machine), BG-017 (Watermark)

**Description:**
Allow Admins to reopen a locked bulletin in emergencies (e.g., last-minute typo fix).

**Acceptance Criteria:**
- [ ] Admin-only action
- [ ] Require reason (min 10 chars, max 500)
- [ ] Update status: locked → draft
- [ ] Set `reopened_at`, `reopened_by`, `reopen_reason`
- [ ] Add "UPDATED [timestamp]" watermark to all regenerated outputs
- [ ] Audit log entry with reason
- [ ] Re-lock: same validation as initial lock
- [ ] Warning in UI: "This bulletin was reopened. All outputs will have a timestamp."

**Files:**
- `services/bulletin-emergency-reopen.ts`

**tRPC Mutation:**
```typescript
emergencyReopen: adminProcedure
  .input(z.object({ issueId: z.string().uuid(), reason: z.string().min(10).max(500) }))
  .mutation(async ({ ctx, input }) => {
    const issue = await db.bulletin_issue.findFirst({
      where: { id: input.issueId, status: 'locked' },
    });

    if (!issue) throw new TRPCError({ code: 'NOT_FOUND' });

    await db.bulletin_issue.update({
      where: { id: input.issueId },
      data: {
        status: 'draft',
        reopened_at: new Date(),
        reopened_by: ctx.user.id,
        reopen_reason: input.reason,
      },
    });

    await db.audit_log.create({
      data: {
        action: 'bulletin.emergency_reopen',
        user_id: ctx.user.id,
        resource_id: input.issueId,
        details: { reason: input.reason },
      },
    });
  });
```

---

### Epic 6: Artifact Management

#### BG-020: Azure Blob Upload Service
**Priority:** P0 (Blocker)
**Effort:** 3 points (2 days)
**Dependencies:** None

**Description:**
Integrate Azure Blob Storage for artifact uploads (PDFs, images, videos, bundles).

**Acceptance Criteria:**
- [ ] Azure Storage SDK installed (`@azure/storage-blob`)
- [ ] Container: `bulletins/{tenant_id}/{issue_id}/`
- [ ] Upload function: `uploadToBlob(buffer, filename)` → CDN URL
- [ ] Set content-type headers (application/pdf, image/jpeg, video/mp4)
- [ ] Set cache headers (1 year for locked bulletins)
- [ ] Versioning: append timestamp for emergency reopens
- [ ] Public read access (CDN)
- [ ] Delete old versions after 90 days (lifecycle policy)

**Files:**
- `services/storage/blob-upload.ts`

**Function:**
```typescript
async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  issueId: string,
  tenantId: string
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient('bulletins');
  const blobName = `${tenantId}/${issueId}/${filename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: getMimeType(filename),
      blobCacheControl: 'public, max-age=31536000', // 1 year
    },
  });

  return blockBlobClient.url; // CDN URL
}
```

---

#### BG-021: Artifact Download API
**Priority:** P1 (High)
**Effort:** 2 points (1 day)
**Dependencies:** BG-020 (Blob upload)

**Description:**
Provide tRPC query to fetch all artifact URLs for a locked bulletin.

**Acceptance Criteria:**
- [ ] Query: `bulletin.artifacts(issueId)` → ArtifactURLs
- [ ] Return all 6 artifact URLs (PDF, large PDF, slides, loop, email, ProPresenter)
- [ ] Only available for bulletins in 'locked' state
- [ ] Add download headers (Content-Disposition: attachment)
- [ ] Track downloads in analytics (future)

**Files:**
- `routers/bulletin-router.ts`

**tRPC Query:**
```typescript
artifacts: authedProcedure
  .input(z.object({ issueId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const issue = await db.bulletin_issue.findFirst({
      where: { id: input.issueId, tenant_id: ctx.user.tenantId, status: 'locked' },
    });

    if (!issue) throw new TRPCError({ code: 'NOT_FOUND' });

    return {
      pdf_url: issue.pdf_url,
      pdf_large_print_url: issue.pdf_large_print_url,
      slides_json: issue.slides_json,
      loop_mp4_url: issue.loop_mp4_url,
      email_html: issue.email_html,
      propresenter_bundle_url: issue.propresenter_bundle_url,
    };
  });
```

---

### Epic 7: Testing & Acceptance

#### BG-022: Unit Tests (Validation & State Machine)
**Priority:** P0 (Blocker)
**Effort:** 3 points (2 days)
**Dependencies:** BG-002 (Validation), BG-016 (State machine)

**Description:**
Write unit tests for validation logic and state machine transitions.

**Test Cases:**
- [ ] Validate CCLI missing → returns error
- [ ] Validate announcement char limit → returns error for 61 chars
- [ ] State transition: draft → approved → built → locked (happy path)
- [ ] State transition: built → draft (invalid, should throw)
- [ ] Emergency reopen: locked → draft → locked (valid)
- [ ] Content hash: same input → same hash (deterministic)

**Files:**
- `services/__tests__/bulletin-validator.test.ts`
- `services/__tests__/bulletin-state-machine.test.ts`

**Framework:** Jest or Vitest

---

#### BG-023: Integration Tests (Render Pipeline)
**Priority:** P1 (High)
**Effort:** 5 points (3 days)
**Dependencies:** BG-010, BG-011, BG-012, BG-013

**Description:**
Test end-to-end render pipeline: HTML → PDF/JPG/MP4/HTML.

**Test Cases:**
- [ ] Render PDF: verify output is valid PDF (parse with pdf-parse)
- [ ] Render slides: verify 12 JPGs at 1920x1080
- [ ] Render loop: verify MP4 duration = 120 seconds (12 slides × 10 sec)
- [ ] Render email: verify inline CSS (no <style> tags)
- [ ] Large print: verify 120% scale applied
- [ ] Watermark: verify "PROOF" appears in preview PDF
- [ ] ProPresenter: verify .zip contains playlist.pro6

**Files:**
- `services/__tests__/render-pipeline.test.ts`

**Framework:** Jest + Playwright Test

---

#### BG-024: E2E Acceptance Tests (Playwright)
**Priority:** P0 (Blocker)
**Effort:** 8 points (5 days)
**Dependencies:** P18 (Acceptance test framework), All BG tasks

**Description:**
Automated E2E tests for critical bulletin workflows.

**Test Scenarios:**
1. **Happy Path:** Intake → Build → Lock → Download all artifacts
2. **Validation:** Attempt to lock without CCLI → blocked with error
3. **Announcement Overflow:** 10 announcements → top 3 large, rest two-column
4. **Imposition:** Half-letter booklet → pages ordered 4-1, 2-3
5. **Large Print:** Generate large print → verify 120% scale
6. **Lock Immutability:** Attempt to edit locked bulletin → blocked
7. **Emergency Reopen:** Admin reopens → adds timestamp → re-lock
8. **Watermark:** Preview has PROOF → lock removes it

**Files:**
- `e2e/bulletin-generator.spec.ts`

**Framework:** Playwright Test

**Example:**
```typescript
test('Happy path: Create bulletin, build, lock, download', async ({ page }) => {
  // Login as Editor
  await page.goto('/bulletins');
  await page.click('text=Create Bulletin');

  // Fill intake form
  await page.fill('[name="issue_date"]', '2025-11-17');
  await page.click('text=Service Plan');
  // ... add service items

  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready');

  // Lock (as Admin)
  await loginAsAdmin(page);
  await page.click('text=Lock Bulletin');
  await page.waitForSelector('text=Bulletin Locked');

  // Download PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download PDF'),
  ]);

  expect(download.suggestedFilename()).toBe('bulletin-2025-11-17.pdf');
});
```

---

## Effort Summary

| Epic | Tasks | Total Points | Duration (est.) |
|------|-------|--------------|-----------------|
| 1. Data Model & Validations | BG-001, BG-002 | 5 | 3 days |
| 2. Intake Form UI | BG-003, BG-004, BG-005, BG-006 | 16 | 10 days |
| 3. Template Engine | BG-007, BG-008, BG-009 | 18 | 11 days |
| 4. Render Pipeline | BG-010 to BG-015 | 25 | 15 days |
| 5. Locking & State | BG-016 to BG-019 | 13 | 8 days |
| 6. Artifact Management | BG-020, BG-021 | 5 | 3 days |
| 7. Testing | BG-022 to BG-024 | 16 | 10 days |
| **TOTAL** | **24 tasks** | **98 points** | **60 days (12 weeks)** |

**Velocity Assumption:** 8 points/week (1 developer)
**Recommended:** 2 developers → 6 weeks delivery

---

## Dependencies Graph

```
BG-001 (Schema) ────────────┬──→ BG-002 (Validation) ──┬──→ BG-003 (Service Plan Tab)
                            │                          ├──→ BG-004 (Announcements Tab)
P5 (API) ───────────────────┤                          └──→ BG-005 (Branding Tab)
                            │                                    │
P6 (Wireframes) ────────────┴──────────────────────────────────┤
                                                                 │
                                                                 ▼
                                                        BG-006 (Intake Layout)
                                                                 │
                                                                 ▼
                                            BG-007 (Template Blocks) ──┬──→ BG-008 (Single Sheet)
                                                                        └──→ BG-009 (Booklet + Imposition)
                                                                              │
                                                                              ▼
                                                                        BG-010 (PDF Renderer)
                                                                              │
                                                                              ├──→ BG-011 (Slides)
                                                                              │      │
                                                                              │      └──→ BG-012 (Loop Video)
                                                                              │      └──→ BG-014 (ProPresenter)
                                                                              │
                                                                              ├──→ BG-013 (Email HTML)
                                                                              └──→ BG-015 (Large Print)
                                                                                    │
                                                                                    ▼
BG-016 (State Machine) ◄──┬─────────────────────────────────────────────────────┘
                           │
BG-017 (Watermark) ────────┤
BG-018 (Content Hash) ─────┤
BG-019 (Emergency Reopen) ─┘
                           │
BG-020 (Blob Upload) ──────┤
BG-021 (Download API) ─────┘
                           │
                           ▼
          BG-022, BG-023, BG-024 (Testing)
```

---

## Risk & Mitigation

**Risk 1: PDF rendering inconsistencies across browsers**
- **Mitigation:** Use Playwright Chromium (consistent engine), embed fonts, test on multiple OS

**Risk 2: FFmpeg complexity for video generation**
- **Mitigation:** Use cloud transcoder (Azure Media Services) as fallback, or simplify to static slide show

**Risk 3: Large file uploads (4MB images) slow down intake form**
- **Mitigation:** Client-side image compression (browser-image-compression), upload progress indicator

**Risk 4: ProPresenter format changes in newer versions**
- **Mitigation:** Document PP7 XML format, provide manual import instructions as fallback

**Risk 5: Emergency reopens abused (frequent unlocks)**
- **Mitigation:** Audit log visible to church leadership, monthly report of reopen frequency

---

## Success Metrics

- [ ] **"One Form" Compliance:** 100% of bulletins created via intake form (no manual PDF uploads)
- [ ] **Lock Rate:** 90%+ of bulletins locked by Thursday 2pm (deadline)
- [ ] **Error Rate:** <5% of build attempts fail validation
- [ ] **Artifact Quality:** 0 reports of missing CCLI, truncated text, or layout breaks
- [ ] **Adoption:** 50+ churches using bulletin generator within 6 months of launch

---

## Next Steps

1. **P9:** Renderer Templates (create actual .ejs files and CSS tokens)
2. **P10:** Playwright Render Service (scaffold render service in TypeScript)
3. **P11:** Locking & Audit (implement state machine + audit triggers)
4. **P18:** Acceptance Tests (write Playwright E2E tests)

**Ready to proceed with P9?**

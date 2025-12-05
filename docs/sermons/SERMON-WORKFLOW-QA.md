# Sermon Workflow QA Checklist

**Version:** 1.0
**Last Updated:** 2025-12-02
**Applies to:** Sermon Builder, Preach Mode, Print View

This document provides step-by-step manual testing instructions for the sermon workflow features. It is designed to be used by non-engineers for quality assurance testing.

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [A. Sermon Builder - Desktop](#a-sermon-builder---desktop)
3. [B. Sermon Builder - Tablet](#b-sermon-builder---tablet)
4. [C. Preach Mode - Phone & Tablet](#c-preach-mode---phone--tablet)
5. [D. Preach Mode - Fallback Behavior](#d-preach-mode---fallback-behavior)
6. [E. Print View](#e-print-view)
7. [F. Service/Bulletin Integration](#f-servicebulletin-integration)
8. [Automated Test Plan](#automated-test-plan)

---

## Test Environment Setup

Before running tests:

1. **Log in** to the app with an account that has Editor or Admin permissions
2. **Have test data ready:**
   - At least one existing sermon with a full outline
   - At least one bulletin with a linked sermon service item
3. **Devices to test on:**
   - Desktop/laptop with Chrome or Edge
   - Tablet (iPad or Android tablet) with Chrome/Safari
   - Phone (iPhone or Android) with Chrome/Safari

---

## A. Sermon Builder - Desktop

### A1. Create a New Sermon from Scratch

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to **Sermons** in the main navigation | Sermon list page loads | [ ] |
| 2 | Click **"New Sermon"** button | New sermon form opens | [ ] |
| 3 | Fill in: Title = "Test Sermon QA", Date = next Sunday | Fields accept input | [ ] |
| 4 | Fill in: Preacher = "Pastor Test", Scripture = "John 3:16" | Fields accept input | [ ] |
| 5 | Click **Save** or **Create** | Sermon is created, redirects to detail page | [ ] |
| 6 | Scroll down to find the **Sermon Builder** section | Builder shows Step 1 "Text & Setup" | [ ] |

### A2. Use the 4-Step Builder Flow

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | In Step 1 (Text & Setup), verify scripture passage shows "John 3:16" | Passage field populated | [ ] |
| 2 | Click **"Next: Big Idea & Audience"** | Moves to Step 2 | [ ] |
| 3 | In Step 2, enter Audience Focus: "Sunday morning adults" | Field accepts input | [ ] |
| 4 | Enter Big Idea: "God loves you so much He gave His Son" | Field accepts input | [ ] |
| 5 | Click **"Next: Outline"** | Moves to Step 3 (Outline) | [ ] |
| 6 | Step 3 should show empty outline with message "No blocks yet" | Empty state message visible | [ ] |

### A3. Using the 3-Point Template

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | In Step 3 (Outline), click **"📋 3-Point Template"** button | Template is inserted | [ ] |
| 2 | Verify 6 blocks appear: Introduction, Point 1, Point 2, Point 3, Application, Conclusion | All 6 blocks visible | [ ] |
| 3 | Verify Introduction shows as "NOTE" type (gray badge) | Gray "Note" badge visible | [ ] |
| 4 | Verify Point 1, 2, 3 show as "POINT" type (blue badge) | Blue "Point" badges visible | [ ] |
| 5 | Verify Application and Conclusion show as "NOTE" type | Gray badges visible | [ ] |

### A4. Mixing Block Types

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Click **"+ Add Block"** button | New block appears at bottom | [ ] |
| 2 | On the new block, click the type dropdown (shows "Point") | Dropdown opens with options | [ ] |
| 3 | Select **"Scripture"** from dropdown | Badge changes to amber "Scripture" | [ ] |
| 4 | Verify label field changes to "Scripture Title/Reference" | Placeholder text updates | [ ] |
| 5 | Add another block, change type to **"Illustration"** | Green "Illustration" badge shows | [ ] |
| 6 | Add another block, change type to **"Note"** | Gray "Note" badge shows | [ ] |

### A5. Toggling Slides/Print Flags

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Find a "Point" block | Block is visible | [ ] |
| 2 | Look for **"Slides"** toggle button (should be blue/highlighted) | Button shows active state | [ ] |
| 3 | Click the "Slides" toggle | Button becomes gray/inactive | [ ] |
| 4 | Look for **"Print"** toggle button (should be green/highlighted) | Button shows active state | [ ] |
| 5 | Click the "Print" toggle | Button becomes gray/inactive | [ ] |
| 6 | Click **"Next: Finalize"** then **"Save Outline"** | Saves without error | [ ] |
| 7 | Refresh the page | Settings persist after reload | [ ] |
| 8 | Navigate back to Step 3 (Outline) | Toggle states are preserved | [ ] |

### A6. Fill in Block Content

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | On "Point 1" block, enter Label: "God's Love" | Field accepts text | [ ] |
| 2 | Enter Scripture Ref: "John 3:16a" | Field accepts text | [ ] |
| 3 | Enter Summary: "God loved the world so much..." (50+ chars) | Field accepts text | [ ] |
| 4 | Expand "Additional Notes" section | Notes textarea appears | [ ] |
| 5 | Enter some notes text | Field accepts text | [ ] |
| 6 | Save the outline | Saves successfully | [ ] |

### A7. Status Changes

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to Step 4 (Finalize) | Status dropdown visible | [ ] |
| 2 | Change status from "Draft" to **"Ready for Sunday"** | Status changes | [ ] |
| 3 | If sermon is linked to a service item, confirmation shows sync count | Message like "Synced to 1 service item(s)" | [ ] |
| 4 | Change status to "Preached" | Status updates | [ ] |

---

## B. Sermon Builder - Tablet

### B1. Editing an Existing Sermon on Tablet

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Open the app on a tablet browser | App loads properly | [ ] |
| 2 | Navigate to **Sermons** list | List displays | [ ] |
| 3 | Tap on an existing sermon | Detail page opens | [ ] |
| 4 | Scroll to the Sermon Builder section | Builder is visible | [ ] |
| 5 | Tap on Step 3 (Outline) | Outline step opens | [ ] |
| 6 | Tap on a block type dropdown | Dropdown opens properly (no overlap issues) | [ ] |
| 7 | Select a different block type | Selection works | [ ] |
| 8 | Tap in a text field (Label, Summary) | Keyboard appears, can type | [ ] |
| 9 | Tap "Slides" toggle | Toggle responds to touch | [ ] |
| 10 | Save the outline | Saves without issues | [ ] |

### B2. Touch Comfort Check

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Check that buttons are large enough to tap easily | Buttons are at least ~44px tap target | [ ] |
| 2 | Check that dropdowns don't overlap other elements | Clean layout | [ ] |
| 3 | Scroll through a long outline | Scrolling is smooth | [ ] |

---

## C. Preach Mode - Phone & Tablet

### C1. Opening Preach Mode

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | From sermon detail page, tap **"Preach Mode"** button | Preach Mode opens full-screen | [ ] |
| 2 | First slide shows sermon title and scripture | Title and scripture visible | [ ] |
| 3 | Dark background is default | Screen is dark with light text | [ ] |

### C2. Tap Zone Navigation

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Tap the **right side** of the screen (right third) | Moves to next slide | [ ] |
| 2 | Tap the **right side** again | Moves forward again | [ ] |
| 3 | Tap the **left side** of the screen (left third) | Moves to previous slide | [ ] |
| 4 | When on first slide, tap left side | Nothing happens (already at start) | [ ] |
| 5 | Navigate to last slide, tap right side | Nothing happens (already at end) | [ ] |

### C3. Keyboard Navigation (if available)

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Press **Right Arrow** key | Moves to next slide | [ ] |
| 2 | Press **Space** key | Moves to next slide | [ ] |
| 3 | Press **Left Arrow** key | Moves to previous slide | [ ] |
| 4 | Press **Escape** key | Exits Preach Mode | [ ] |

### C4. Setting Target Time

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Open Preach Mode | Mode opens | [ ] |
| 2 | Tap the **gear icon** (Settings) in top right | Settings panel appears | [ ] |
| 3 | Enter "2" in "Target Time (minutes)" field | Field accepts input | [ ] |
| 4 | Close settings (tap elsewhere or tap gear again) | Settings closes | [ ] |
| 5 | Tap **Play** button on timer | Timer starts counting | [ ] |
| 6 | Wait until timer shows 2:00 or more | Timer continues past 2:00 | [ ] |
| 7 | Verify timer background turns **red** | Red background on timer area | [ ] |
| 8 | Verify **"+0:XX over"** text appears | Overtime indicator shows | [ ] |

### C5. Timer Controls

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Tap **Play** button | Timer starts | [ ] |
| 2 | Tap **Pause** button | Timer stops | [ ] |
| 3 | Tap **Reset** button (circular arrow) | Timer resets to 0:00 | [ ] |

### C6. Block Type Styling

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Navigate to a **POINT** block | Blue text, bold, with divider line above | [ ] |
| 2 | Navigate to a **SCRIPTURE** block (if present) | Amber/gold text, italic styling | [ ] |
| 3 | Navigate to an **ILLUSTRATION** block (if present) | Green text, medium weight | [ ] |
| 4 | Navigate to a **NOTE** block | Gray/muted text, smaller size | [ ] |
| 5 | Each block shows its type badge (small icon + label) | Type badge visible | [ ] |

### C7. Dark/Light Mode Toggle

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Tap the **sun/moon icon** in top right | Background toggles light/dark | [ ] |
| 2 | In light mode, text is dark on light background | Readable | [ ] |
| 3 | Toggle back to dark mode | Dark background returns | [ ] |

### C8. Fullscreen Toggle

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Tap the **expand icon** (square with arrows) | Browser enters fullscreen | [ ] |
| 2 | Press **F** key on keyboard (if available) | Also toggles fullscreen | [ ] |
| 3 | Tap the **minimize icon** or press Escape | Exits fullscreen | [ ] |

### C9. Font Size Adjustment

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | On desktop/tablet, find **A-** and **A+** buttons | Buttons visible in top bar | [ ] |
| 2 | Tap **A+** several times | Text gets larger | [ ] |
| 3 | Tap **A-** several times | Text gets smaller | [ ] |
| 4 | On mobile, open Settings (gear) to find font controls | Font size controls in settings | [ ] |

### C10. Network Disconnection Test

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Open Preach Mode with a sermon loaded | Mode opens, content visible | [ ] |
| 2 | Turn off WiFi / enable Airplane mode | Network disconnected | [ ] |
| 3 | Navigate through slides using tap zones | Navigation still works | [ ] |
| 4 | All content remains visible and functional | No errors or blank screens | [ ] |
| 5 | Re-enable network | Network restored | [ ] |

---

## D. Preach Mode - Fallback Behavior

### D1. Sermon with No Outline Points

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Create or find a sermon with no outline points (empty mainPoints) | Sermon exists | [ ] |
| 2 | Open Preach Mode for this sermon | Mode opens | [ ] |
| 3 | Screen shows **fallback view** with title, scripture, big idea (if any) | Content visible | [ ] |
| 4 | If sermon has manuscript, it displays in scrollable format | Manuscript readable | [ ] |
| 5 | Message "(No structured outline - showing full content)" appears | Fallback indicator visible | [ ] |
| 6 | Navigation shows "1 / 1" (single fallback slide) | Slide count is 1 | [ ] |

---

## E. Print View

### E1. Opening Print View from Sermon Detail

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to a sermon detail page | Detail page loads | [ ] |
| 2 | Click **"Print Outline"** button in header | Print page opens at `/sermons/[id]/print` | [ ] |
| 3 | Page shows clean, print-friendly layout | No navigation bars in main content | [ ] |

### E2. Print View Header Content

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Verify sermon **title** appears at top | Title visible | [ ] |
| 2 | Verify **preacher name** appears | Preacher visible | [ ] |
| 3 | Verify **date** appears (formatted nicely, e.g., "Sunday, December 8, 2025") | Date visible | [ ] |
| 4 | Verify **scripture** reference appears | Scripture visible | [ ] |
| 5 | If sermon has a Big Idea, verify it shows in a highlighted box | Big Idea box visible | [ ] |

### E3. Print View Respects includeInPrint Flag

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | In Sermon Builder, set one block's "Print" toggle to OFF | Toggle is gray/inactive | [ ] |
| 2 | Save the outline | Saves | [ ] |
| 3 | Open Print View | Print page loads | [ ] |
| 4 | Verify the block with "Print" OFF is **not shown** | Block is missing from print | [ ] |
| 5 | All other blocks (with "Print" ON) appear | Other blocks visible | [ ] |

### E4. Block Type Formatting in Print

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | **POINT** blocks show numbered (1, 2, 3) with bold labels | Numbers and bold visible | [ ] |
| 2 | **SCRIPTURE** blocks show italic text with amber/gold left border | Styling distinct | [ ] |
| 3 | **ILLUSTRATION** blocks show with "Illustration" label | Label visible | [ ] |
| 4 | **NOTE** blocks show smaller/muted text | Smaller styling | [ ] |

### E5. Print View Footer Content

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | If sermon has Application, verify it appears in footer | Application section visible | [ ] |
| 2 | If sermon has Call to Action, verify it appears in highlighted box | CTA box visible | [ ] |

### E6. Actual Printing

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Click the **"Print"** button on print page | Browser print dialog opens | [ ] |
| 2 | Select "Save as PDF" as printer | PDF preview shows | [ ] |
| 3 | Verify content fits on pages without cutting off mid-block | Clean page breaks | [ ] |
| 4 | Print to physical printer (if available) | Paper output is readable | [ ] |

### E7. Opening Print View from Service Items

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to a bulletin that has a linked sermon | Bulletin page loads | [ ] |
| 2 | Find the sermon service item in the list | Sermon item visible | [ ] |
| 3 | Click the **"Print"** link/button on the service item | Print page opens | [ ] |

---

## F. Service/Bulletin Integration

### F1. Sermon Links in Service Items

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Go to a bulletin with a linked sermon service item | Bulletin page loads | [ ] |
| 2 | Find the sermon item in the Order of Service list | Item visible with sermon title | [ ] |
| 3 | Verify sermon title is shown as a link | Title is clickable | [ ] |
| 4 | Click the sermon title | Navigates to sermon detail page | [ ] |

### F2. Preach and Print Quick Links

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | On a sermon service item, find the **"Preach"** button | Purple "Preach" button visible | [ ] |
| 2 | Click "Preach" | Opens Preach Mode for that sermon | [ ] |
| 3 | Exit Preach Mode, return to bulletin | Back on bulletin page | [ ] |
| 4 | Find the **"Print"** button on the same item | Gray "Print" button visible | [ ] |
| 5 | Click "Print" | Opens Print View for that sermon | [ ] |

### F3. setReadyAndSync Behavior (Existing Feature Verification)

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1 | Create a sermon and link it to a service item in a bulletin | Sermon linked | [ ] |
| 2 | In Sermon Builder, go to Step 4 (Finalize) | Finalize step opens | [ ] |
| 3 | Change status to **"Ready for Sunday"** | Status changes | [ ] |
| 4 | Verify message shows "Synced to X service item(s)" | Sync confirmation | [ ] |
| 5 | Go to the bulletin and check the service item | Item shows updated title/preacher from sermon | [ ] |

---

## Automated Test Plan

This section outlines the automated tests that should be written for the sermon workflow features.

### Test Framework

The project uses **Jest** (as seen in `apps/api/src/utils/bookletPdf.test.ts`). New tests should follow the same pattern and import from `@jest/globals`.

### Unit Tests: Type Helpers

**File:** `packages/types/src/__tests__/sermonBlocks.test.ts`

These tests verify the helper functions work correctly:

| Test Case | Description |
|-----------|-------------|
| `getEffectiveBlockType` returns 'POINT' when type is undefined | Backward compatibility |
| `getEffectiveBlockType` returns the type when defined | Pass-through behavior |
| `getBlockDefaults` returns correct defaults for POINT | showOnSlides=true, includeInPrint=true |
| `getBlockDefaults` returns correct defaults for SCRIPTURE | showOnSlides=true, includeInPrint=true |
| `getBlockDefaults` returns correct defaults for ILLUSTRATION | showOnSlides=false, includeInPrint=true |
| `getBlockDefaults` returns correct defaults for NOTE | showOnSlides=false, includeInPrint=true |
| `getBlockDefaults` handles undefined type (defaults to POINT) | Backward compatibility |

### Component Tests: PreachMode

**File:** `apps/web/src/components/sermons/__tests__/PreachMode.test.tsx`

Note: These tests would require setting up React Testing Library. If the project does not have RTL configured, these can be documented as future work.

| Test Case | Description |
|-----------|-------------|
| Renders title slide for sermon with outline | First block is header with title |
| Renders fallback view when no mainPoints | Shows manuscript/bigIdea |
| Block styling matches block type | POINT has bold label, SCRIPTURE has italic |
| Overtime flag activates when elapsed > target | Timer shows red state |
| Navigation increments/decrements block index | goNext/goPrev work |

### Smoke Tests: Print Route

**File:** `apps/web/src/app/sermons/[id]/print/__tests__/page.test.tsx`

| Test Case | Description |
|-----------|-------------|
| Page renders without crashing | Basic smoke test |
| Filters out blocks with includeInPrint=false | Only printable blocks shown |
| Shows header fields (title, preacher, date) | Header content present |

### E2E Tests (Future)

The project has Playwright available (`artifacts/P18_playwright.spec.ts`). Future E2E tests could cover:

- Full sermon creation flow
- Preach Mode navigation
- Print page generation

### Test File Locations

Following the existing pattern:

```
packages/types/src/__tests__/
  sermonBlocks.test.ts       # Unit tests for type helpers

apps/web/src/components/sermons/__tests__/
  PreachMode.test.tsx        # Component tests (if RTL configured)

apps/web/src/app/sermons/[id]/print/__tests__/
  page.test.tsx              # Smoke test for print route
```

### Running Tests

Once tests are added:

```bash
# From project root
npm test

# Or run specific test file
npx jest packages/types/src/__tests__/sermonBlocks.test.ts
```

---

## Test Results Summary

| Section | Total Tests | Passed | Failed | Notes |
|---------|-------------|--------|--------|-------|
| A. Desktop Builder | 27 | | | |
| B. Tablet Builder | 12 | | | |
| C. Preach Mode | 32 | | | |
| D. Fallback | 6 | | | |
| E. Print View | 18 | | | |
| F. Integration | 10 | | | |
| **TOTAL** | **105** | | | |

**Tested By:** _____________________
**Date:** _____________________
**Build/Version:** _____________________

---

## Known Issues / Notes

Document any issues found during testing here:

1. _____________________
2. _____________________
3. _____________________

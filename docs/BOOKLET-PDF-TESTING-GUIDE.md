# Booklet PDF Generation - Testing Guide

## Overview

This guide explains how to manually test the 4-page booklet PDF generation feature for bulletins.

**Last Updated:** 2025-11-26

---

## Quick Reference

### Booklet PDF Constraints

- **Maximum pages:** 4 logical pages
- **Shorter bulletins:** Automatically padded with blank pages
- **Oversized bulletins:** Reject with clear error message
- **Imposition:**
  - Front sheet (landscape): Page 4 (left) | Page 1 (right)
  - Back sheet (landscape): Page 2 (left) | Page 3 (right)

---

## Manual Testing Procedure

### Prerequisites

1. **Start dev servers:**
   ```bash
   # Terminal 1 - API
   cd apps/api
   npm run dev

   # Terminal 2 - Web
   cd apps/web
   npm run dev
   ```

2. **Login to the app:**
   - Navigate to `http://localhost:3045`
   - Login with admin/editor credentials

---

### Test Case 1: Short Bulletin (1-2 Pages)

**Purpose:** Verify blank page handling

**Setup:**
1. Create or find a bulletin with minimal content:
   - 2-3 service items
   - No announcements
   - No optional sections (notes, prayer cards, etc.)

**Expected PDF Output:**
```
Input: 2 pages portrait

Booklet PDF Output: 2 pages landscape
- Front spread: [blank | page 1]
- Back spread:  [page 2 | blank]
```

**Steps:**
1. Navigate to the bulletin detail page
2. Click "📖 Download 4-Page Booklet PDF"
3. Wait for download to complete
4. Open the downloaded PDF

**Verify:**
- ✅ PDF opens without errors
- ✅ 2 landscape pages
- ✅ Front page has content on RIGHT half, blank on LEFT
- ✅ Back page has content on LEFT half, blank on RIGHT
- ✅ Content is centered and properly scaled

**Logs to Check:**
```
[Booklet] Input PDF has 2 pages
[Booklet] Logical page 1: real content
[Booklet] Logical page 2: real content
[Booklet] Logical page 3: blank
[Booklet] Logical page 4: blank
[Booklet] Adding spread 1: page blank (left) + page 1 (right)
[Booklet] Adding spread 2: page 2 (left) + page blank (right)
```

---

### Test Case 2: Normal Bulletin (3-4 Pages)

**Purpose:** Verify full 4-page booklet works correctly

**Setup:**
1. Create or find a bulletin with:
   - 5-6 service items
   - 2-3 announcements
   - Standard sections only (no extras)

**Expected PDF Output:**
```
Input: 4 pages portrait

Booklet PDF Output: 2 pages landscape
- Front spread: [page 4 | page 1]
- Back spread:  [page 2 | page 3]
```

**Steps:**
1. Navigate to the bulletin detail page
2. Click "📖 Download 4-Page Booklet PDF"
3. Open the downloaded PDF

**Verify:**
- ✅ PDF opens without errors
- ✅ 2 landscape pages
- ✅ Front spread: Page 4 LEFT, Page 1 RIGHT
- ✅ Back spread: Page 2 LEFT, Page 3 RIGHT
- ✅ All 4 logical pages have content
- ✅ No blank spaces

**Logs to Check:**
```
[Booklet] Input PDF has 4 pages
[Booklet] Logical page 1: real content
[Booklet] Logical page 2: real content
[Booklet] Logical page 3: real content
[Booklet] Logical page 4: real content
[Booklet] Adding spread 1: page 4 (left) + page 1 (right)
[Booklet] Adding spread 2: page 2 (left) + page 3 (right)
```

---

### Test Case 3: Oversized Bulletin (>4 Pages)

**Purpose:** Verify BULLETIN_TOO_LONG error handling

**Setup:**
1. Create a bulletin with TOO MUCH content:
   - 15+ service items
   - 10+ announcements
   - Enable notes page in design options
   - Enable prayer request card
   - Enable connect card

2. First, check the print preview:
   - Visit `/bulletins/[id]/print?mode=booklet`
   - Use browser's Print → Save as PDF
   - Check how many pages it generates
   - If > 4 pages, proceed to test

**Expected Behavior:**
```
Input: 5+ pages portrait

Result: Error message
"This bulletin is too long for a 4-page booklet (got X pages).
Please remove some content (fewer announcements or a shorter
order of service) and try again."
```

**Steps:**
1. Navigate to the bulletin detail page
2. Click "📖 Download 4-Page Booklet PDF"
3. Wait for error to appear

**Verify:**
- ✅ Alert dialog appears
- ✅ Message says "📖 Bulletin Too Long"
- ✅ Message includes page count (e.g., "got 5 pages")
- ✅ Message includes helpful tip about removing content
- ✅ No PDF download occurs

**Logs to Check:**
```
[Booklet] Input PDF has 5 pages
[BULLETIN BOOKLET] Error generating booklet PDF: Error: This bulletin is too long...
Error code: BULLETIN_TOO_LONG
```

**Recovery:**
1. Remove some announcements (go from 10 to 3)
2. Disable notes page in design options
3. Disable prayer/connect cards
4. Try downloading booklet PDF again
5. Should now succeed

---

### Test Case 4: Visual Verification

**Purpose:** Verify imposition is correct when physically printed

**Steps:**
1. Generate a 4-page booklet PDF (Test Case 2)
2. Print it with these settings:
   - **Paper:** US Letter (8.5" x 11")
   - **Orientation:** Landscape
   - **Print on both sides:** Enabled
   - **Flip on:** SHORT edge
   - **Margins:** None or minimal
   - **Do NOT enable:** Printer's "booklet" mode

3. Fold the printed sheet in half (short edge to short edge)

**Verify:**
- ✅ When closed, page 1 is on the front cover
- ✅ When opened, pages 2 and 3 are visible as a spread
- ✅ When you flip over the back cover, page 4 is visible
- ✅ All pages are in correct reading order: 1, 2, 3, 4

---

## Common Issues & Solutions

### Issue: "Can't embed page with missing Contents"

**Cause:** Old code tried to embed blank pages created with `addPage()`

**Solution:** Already fixed - we now use `null` for blank pages instead

---

### Issue: PDF shows login page instead of bulletin

**Cause:** Cookies not being forwarded to headless browser

**Fix:**
1. Check API logs for: `[PDF] Has cookies: true`
2. If false, check that `ctx.req?.headers?.cookie` exists in router
3. Verify user is logged in and session is valid

---

### Issue: PDF shows "Loading bulletin..."

**Cause:** Playwright capturing page before data loads

**Fix:**
1. Check print page sets `data-print-ready="true"` when loaded
2. Check API logs for: `[PDF] Bulletin data ready, generating PDF...`
3. If timeout, check TRPC queries are completing successfully

---

### Issue: Booklet is blank or missing pages

**Cause:** Incorrect imposition or null page handling

**Debug:**
1. Check API logs for logical page mapping:
   ```
   [Booklet] Logical page 1: real content
   [Booklet] Logical page 2: real content
   [Booklet] Logical page 3: blank
   [Booklet] Logical page 4: blank
   ```
2. Verify spread logging:
   ```
   [Booklet] Adding spread 1: page blank (left) + page 1 (right)
   [Booklet] Adding spread 2: page 2 (left) + page blank (right)
   ```

---

## Automated Testing

### Run Unit Tests

```bash
cd apps/api

# Install test dependencies (if not already installed)
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test -- bookletPdf.test.ts
```

### Test Coverage

The unit tests cover:
- ✅ 1-page bulletin (mostly blanks)
- ✅ 2-page bulletin (some blanks)
- ✅ 3-page bulletin (one blank)
- ✅ 4-page bulletin (no blanks)
- ✅ 5-page bulletin (BULLETIN_TOO_LONG error)
- ✅ 10-page bulletin (BULLETIN_TOO_LONG error)

---

## Quick Test Checklist

Use this for rapid verification after code changes:

- [ ] Short bulletin (1-2 pages) → Downloads successfully
- [ ] Normal bulletin (3-4 pages) → Downloads successfully
- [ ] Oversized bulletin (5+ pages) → Shows clear error
- [ ] Front spread imposition is correct (4|1)
- [ ] Back spread imposition is correct (2|3)
- [ ] Blank pages render as white space (no errors)
- [ ] Error message is user-friendly and actionable

---

## Files to Monitor

When debugging issues, check these files:

1. **`apps/api/src/utils/bookletPdf.ts`**
   - Core booklet generation logic
   - Null page handling
   - Error throwing

2. **`apps/api/src/routers/bulletins.ts`**
   - generateBookletPdf mutation (lines 1677-1802)
   - Error handling and TRPC error codes

3. **`apps/web/src/app/bulletins/[id]/page.tsx`**
   - generateBookletPdf mutation hook (lines 186-229)
   - onError handler with BULLETIN_TOO_LONG check

4. **`apps/web/src/app/bulletins/[id]/print/page.tsx`**
   - Print view with mode=booklet support
   - data-print-ready marker

5. **`apps/api/src/utils/pdfGenerator.ts`**
   - Playwright PDF generation
   - Cookie forwarding
   - data-print-ready waiting

---

## Contact

If you encounter issues not covered in this guide, check:
- API server logs (Terminal 1)
- Browser console logs (F12)
- Network tab for failed requests

Common log prefixes:
- `[Booklet]` - bookletPdf.ts operations
- `[BULLETIN BOOKLET]` - Router mutations
- `[PDF]` - Playwright PDF generation

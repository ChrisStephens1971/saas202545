# Smoke Tests: Sermons & Thank-You Notes

**Purpose:** Manual smoke tests to verify basic functionality of the Sermons and Thank-You Notes (Gratitude) features.

**Last Updated:** 2025-11-19

---

## Prerequisites

- Application running locally (frontend + backend)
- Test user authenticated with appropriate role (admin, editor, or submitter)
- Database seeded with sample data (optional but recommended)

---

## 🎙️ Sermons Feature - Smoke Tests

### Test 1: View Sermons List

**Steps:**
1. Navigate to `/sermons`
2. Verify page loads without errors
3. Check that sermons are displayed in a list/grid
4. Verify sermon cards show: title, date, preacher, series (if applicable)
5. Click on a sermon card

**Expected Result:**
- Sermons list displays correctly
- Clicking a sermon navigates to detail page (`/sermons/[id]`)

---

### Test 2: Create New Sermon

**Steps:**
1. Navigate to `/sermons`
2. Click "Create Sermon" button
3. Fill out the form:
   - **Title:** "Test Sermon Title"
   - **Date:** Select today's date
   - **Preacher:** "Test Preacher"
   - **Primary Scripture:** "John 3:16"
   - **Manuscript:** "This is a test manuscript."
4. Click "Save Sermon"

**Expected Result:**
- Form submission succeeds
- Redirects to sermons list or detail page
- New sermon appears in the list
- Success message displayed (if applicable)

---

### Test 3: View Sermon Detail

**Steps:**
1. Navigate to a sermon detail page (`/sermons/[id]`)
2. Verify all fields display correctly:
   - Title
   - Date
   - Preacher
   - Primary Scripture
   - Additional Scripture (if any)
   - Manuscript (if any)
   - Audio URL (if any)
   - Video URL (if any)
   - Tags (if any)
   - Series (if any)
3. Check that "Edit Sermon" button is visible
4. Check that "Archive Sermon" button is visible

**Expected Result:**
- All sermon data displays correctly
- Page is protected (requires authentication)
- Edit and Archive buttons are functional

---

### Test 4: Edit Sermon

**Steps:**
1. On sermon detail page, click "Edit Sermon"
2. Modify the title to "Updated Test Sermon Title"
3. Click "Save Sermon"

**Expected Result:**
- Form displays with pre-filled data
- Editing succeeds
- Returns to detail page with updated data
- Updated title is visible

---

### Test 5: Archive Sermon

**Steps:**
1. On sermon detail page, click "Archive Sermon"
2. Confirm the archive action in the confirmation dialog
3. Verify redirection to sermons list

**Expected Result:**
- Confirmation dialog appears
- Sermon is soft-deleted (deleted_at timestamp set)
- User redirected to `/sermons`
- Archived sermon no longer appears in main list

---

## 🙏 Thank-You Notes (Gratitude) Feature - Smoke Tests

### Test 6: View Person Detail with Thank-You Notes

**Steps:**
1. Navigate to `/people/[id]` (person detail page)
2. Scroll to "Thank-You Notes" section
3. Verify section displays count: "Thank-You Notes (X)"
4. Check for "Log Thank-You Note" button

**Expected Result:**
- Thank-You Notes section is visible
- Count displays correctly
- Button is present and clickable
- Empty state message if no notes exist

---

### Test 7: Log Thank-You Note from Person Detail

**Steps:**
1. On person detail page, click "Log Thank-You Note"
2. Fill out the form:
   - **Date:** Select today's date
   - **Channel:** Email
   - **Subject:** "Thank you for your service"
   - **Message:** "We appreciate your dedication."
3. Click "Save Thank-You Note"

**Expected Result:**
- Form appears when button clicked
- Form submission succeeds
- Form closes after save
- New note appears in the notes list
- Note displays: date, channel badge, subject, message, logged by name

---

### Test 8: View Donation Detail with Thank-You Notes

**Steps:**
1. Navigate to `/donations/[id]` (donation detail page)
2. Scroll to "Thank-You Notes" section
3. Verify section displays
4. Check "Log Thank-You for Donation" button state
   - Should be **disabled** if donation has no associated person (anonymous)
   - Should be **enabled** if donation has a person

**Expected Result:**
- Thank-You Notes section visible
- Button state correct based on donation type
- Warning message for anonymous donations

---

### Test 9: Log Thank-You Note from Donation Detail

**Steps:**
1. On a donation detail page with a linked person, click "Log Thank-You for Donation"
2. Verify donor name is pre-filled/displayed
3. Fill out the form:
   - **Date:** Select today's date
   - **Channel:** Card
   - **Subject:** "Thank you for your generous donation"
   - **Message:** "Your gift makes a difference."
4. Click "Save Thank-You Note"

**Expected Result:**
- Form displays with donor context
- Note is saved with both personId and donationId
- Note appears in list with donation context

---

### Test 10: View Event Detail with Thank-You Notes

**Steps:**
1. Navigate to `/events/[id]` (event detail page)
2. Scroll to "Thank-You Notes" section
3. Verify section displays count
4. Check "Log Thank-You for Event" button

**Expected Result:**
- Thank-You Notes section visible
- Count displays correctly
- Button is present

---

### Test 11: Log Thank-You Note from Event Detail

**Steps:**
1. On event detail page, click "Log Thank-You for Event"
2. Select a person from the dropdown
3. Fill out the form:
   - **Date:** Select today's date
   - **Channel:** In-Person
   - **Subject:** "Thank you for attending"
   - **Message:** "We're glad you could join us."
4. Click "Save Thank-You Note"

**Expected Result:**
- Form displays with person selection dropdown
- Person dropdown populated with all people
- Note saved with personId and eventId
- Note appears in list with person link

---

### Test 12: View Global Thank-You Notes List

**Steps:**
1. Navigate to `/thank-yous`
2. Verify page displays with table layout
3. Check table headers: Date, Person, Channel, Subject, Donation, Event, Logged By
4. Verify notes display in rows
5. Check that Person names are clickable links
6. Check that "Donation" and "Event" show links when applicable

**Expected Result:**
- Global list page loads successfully
- Table displays all thank-you notes
- Links work correctly (Person → `/people/[id]`, Donation → `/donations/[id]`, Event → `/events/[id]`)
- Page is protected (requires authentication)

---

### Test 13: Filter Thank-You Notes by Date Range

**Steps:**
1. On `/thank-yous` page
2. Set "From Date" to 7 days ago
3. Set "To Date" to today
4. Verify table updates to show only notes in that range

**Expected Result:**
- Filters apply immediately
- Only notes within date range are displayed
- "Reset Filters" button appears

---

### Test 14: Filter Thank-You Notes by Channel

**Steps:**
1. On `/thank-yous` page
2. Select "Email" from Channel dropdown
3. Verify table shows only Email notes

**Expected Result:**
- Filter applies
- Only notes with channel="Email" are displayed
- Channel badges show "Email"

---

### Test 15: Filter Thank-You Notes by Context (Donation/Event)

**Steps:**
1. On `/thank-yous` page
2. Check "Has Donation" checkbox
3. Verify only notes linked to donations are shown
4. Uncheck "Has Donation"
5. Check "Has Event" checkbox
6. Verify only notes linked to events are shown

**Expected Result:**
- "Has Donation" filter shows notes with donation_id not null
- "Has Event" filter shows notes with event_id not null
- Filters can be combined

---

### Test 16: Reset Filters

**Steps:**
1. On `/thank-yous` page with active filters
2. Click "Reset Filters" button

**Expected Result:**
- All filter fields cleared
- Table shows all thank-you notes again
- "Reset Filters" button disappears

---

## 🔐 Authentication & Authorization Tests

### Test 17: Page Protection

**Steps:**
1. Log out (if logged in)
2. Try to navigate to:
   - `/sermons`
   - `/sermons/new`
   - `/sermons/[id]`
   - `/people/[id]`
   - `/donations/[id]`
   - `/events/[id]`
   - `/thank-yous`

**Expected Result:**
- All pages redirect to login or show "Access Denied" message
- No data is visible without authentication

---

### Test 18: Role-Based Access

**Steps:**
1. Log in with different roles (if available):
   - **Submitter:** Should have access to create/edit
   - **Editor:** Should have access to create/edit
   - **Admin:** Should have full access
   - **Viewer:** Should have read-only access (if implemented)
2. Verify appropriate buttons and actions are available based on role

**Expected Result:**
- Pages enforce role requirements
- Users see only actions permitted by their role
- Protected actions are blocked for insufficient roles

---

## ✅ Health Checks (Quick Verification)

### Frontend Health Check

**Command:**
```bash
cd apps/web
npm run typecheck
npx eslint src/app/sermons src/app/people src/app/donations src/app/events src/app/thank-yous
```

**Expected Result:**
- TypeScript: 0 errors
- ESLint: 0 errors

---

### Backend Health Check

**Command:**
```bash
cd apps/api
npm run typecheck
npm run lint
```

**Expected Result:**
- TypeScript: 0 errors
- ESLint: 0 errors

---

## 📊 Test Results Summary

| Test # | Feature | Test Case | Status | Notes |
|--------|---------|-----------|--------|-------|
| 1 | Sermons | View list | ⬜ | |
| 2 | Sermons | Create new | ⬜ | |
| 3 | Sermons | View detail | ⬜ | |
| 4 | Sermons | Edit | ⬜ | |
| 5 | Sermons | Archive | ⬜ | |
| 6 | Gratitude | Person detail view | ⬜ | |
| 7 | Gratitude | Log from person | ⬜ | |
| 8 | Gratitude | Donation detail view | ⬜ | |
| 9 | Gratitude | Log from donation | ⬜ | |
| 10 | Gratitude | Event detail view | ⬜ | |
| 11 | Gratitude | Log from event | ⬜ | |
| 12 | Gratitude | Global list view | ⬜ | |
| 13 | Gratitude | Filter by date | ⬜ | |
| 14 | Gratitude | Filter by channel | ⬜ | |
| 15 | Gratitude | Filter by context | ⬜ | |
| 16 | Gratitude | Reset filters | ⬜ | |
| 17 | Auth | Page protection | ⬜ | |
| 18 | Auth | Role-based access | ⬜ | |

**Legend:**
- ⬜ Not tested
- ✅ Passed
- ❌ Failed
- ⚠️ Partial/needs review

---

## 🐛 Known Issues & Limitations

*(Document any known issues discovered during testing)*

- None at this time

---

## 📝 Notes for Testers

1. **Elder-First Design:** Pay attention to font sizes, button sizes, and contrast. Text should be readable for elderly users.

2. **Data Relationships:** Thank-you notes can be linked to:
   - A person (always required)
   - A donation (optional)
   - An event (optional)

3. **Soft Deletes:** Archived sermons use soft delete (deleted_at timestamp). They should not appear in main lists but may be recoverable.

4. **Performance:** List pages currently load up to 100 items. Test with larger datasets if available.

5. **Browser Testing:** Test in multiple browsers (Chrome, Firefox, Safari, Edge) and devices (desktop, tablet, mobile).

---

## 🔄 Regression Testing

When making changes to these features, re-run all smoke tests to ensure no regressions were introduced.

**Quick Regression Check:**
1. Run Tests 1-5 (Sermons core functionality)
2. Run Tests 6, 7, 12, 13 (Gratitude core functionality)
3. Run Test 17 (Auth protection)

---

**Test Execution Date:** _______________
**Tester:** _______________
**Build/Version:** _______________
**Overall Status:** ⬜ Pass / ⬜ Fail

---

*For automated tests, see: `/apps/web/__tests__` or `/e2e`*

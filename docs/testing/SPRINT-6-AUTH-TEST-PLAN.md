# Sprint 6 Authentication Testing Plan

**Date:** 2025-11-15
**Sprint:** Sprint 6 - Authentication & Authorization
**Tester:** Manual Testing Session

## Test Environment

- **Frontend:** http://localhost:3045
- **Backend API:** http://localhost:8045
- **Database:** PostgreSQL (local)

## Test Roles

We'll test with these 5 roles:

1. **Admin** - Full access to all features
2. **Editor** - Content management access
3. **Submitter** - Can submit content (events, announcements, groups)
4. **Viewer** - Read-only access
5. **Kiosk** - Attendance check-in only

---

## Test Suite 1: Basic Authentication Flow

### Test 1.1: Sign In - Admin Role
- [ ] Navigate to http://localhost:3045/login
- [ ] Enter credentials for admin user
- [ ] Click "Sign In"
- [ ] **Expected:** Redirect to /dashboard
- [ ] **Expected:** Session cookie set
- [ ] **Expected:** User role displayed in header
- [ ] **Result:** ___________

### Test 1.2: Sign In - Editor Role
- [ ] Sign out if logged in
- [ ] Navigate to /login
- [ ] Enter credentials for editor user
- [ ] Click "Sign In"
- [ ] **Expected:** Redirect to /dashboard
- [ ] **Expected:** Session persisted
- [ ] **Result:** ___________

### Test 1.3: Sign In - Submitter Role
- [ ] Repeat for submitter role
- [ ] **Result:** ___________

### Test 1.4: Sign In - Viewer Role
- [ ] Repeat for viewer role
- [ ] **Result:** ___________

### Test 1.5: Sign In - Kiosk Role
- [ ] Repeat for kiosk role
- [ ] **Result:** ___________

### Test 1.6: Session Persistence
- [ ] Sign in as admin
- [ ] Refresh the page (F5)
- [ ] **Expected:** Still logged in, no redirect to /login
- [ ] Navigate to different pages
- [ ] Refresh again
- [ ] **Expected:** Session maintained
- [ ] **Result:** ___________

### Test 1.7: Sign Out
- [ ] Click "Sign Out" button in header
- [ ] **Expected:** Redirect to /login
- [ ] **Expected:** Session cleared
- [ ] Try to navigate to /dashboard
- [ ] **Expected:** Redirect back to /login
- [ ] **Result:** ___________

---

## Test Suite 2: Protected Page Access Control

### Test 2.1: Unauthenticated Access
- [ ] Sign out completely
- [ ] Try to access /bulletins/new directly
- [ ] **Expected:** Redirect to /login
- [ ] Try to access /people
- [ ] **Expected:** Redirect to /login
- [ ] Try to access /events/new
- [ ] **Expected:** Redirect to /login
- [ ] **Result:** ___________

### Test 2.2: Admin Access (Full Access)
- [ ] Sign in as **admin**
- [ ] Navigate to each protected page:
  - [ ] /bulletins/new - **Expected:** Access granted
  - [ ] /events/new - **Expected:** Access granted
  - [ ] /announcements/new - **Expected:** Access granted
  - [ ] /donations/new - **Expected:** Access granted
  - [ ] /forms/new - **Expected:** Access granted
  - [ ] /groups/new - **Expected:** Access granted
  - [ ] /people - **Expected:** Access granted
  - [ ] /people/new - **Expected:** Access granted, "Add Person" button visible
- [ ] **Result:** ___________

### Test 2.3: Editor Access
- [ ] Sign in as **editor**
- [ ] Test access to pages requiring admin/editor:
  - [ ] /bulletins/new - **Expected:** Access granted
  - [ ] /donations/new - **Expected:** Access granted
  - [ ] /forms/new - **Expected:** Access granted
  - [ ] /people - **Expected:** Access granted
  - [ ] /people/new - **Expected:** Access granted, "Add Person" button visible
- [ ] Test access to submitter pages:
  - [ ] /events/new - **Expected:** Access granted (admin/editor/submitter)
  - [ ] /announcements/new - **Expected:** Access granted (admin/editor/submitter)
  - [ ] /groups/new - **Expected:** Access granted (admin/editor/submitter)
- [ ] Test kiosk-only page:
  - [ ] /attendance/new - **Expected:** Redirect to /auth/forbidden
- [ ] **Result:** ___________

### Test 2.4: Submitter Access
- [ ] Sign in as **submitter**
- [ ] Test pages requiring admin/editor only:
  - [ ] /bulletins/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /donations/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /forms/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /people/new - **Expected:** Redirect to /auth/forbidden (if protected)
- [ ] Test pages allowing submitter:
  - [ ] /events/new - **Expected:** Access granted
  - [ ] /announcements/new - **Expected:** Access granted
  - [ ] /groups/new - **Expected:** Access granted
- [ ] Test people list page:
  - [ ] /people - **Expected:** Access granted, but "Add Person" button hidden
- [ ] **Result:** ___________

### Test 2.5: Viewer Access (Read-Only)
- [ ] Sign in as **viewer**
- [ ] Test creation pages (should all be forbidden):
  - [ ] /bulletins/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /events/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /announcements/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /donations/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /forms/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /groups/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /attendance/new - **Expected:** Redirect to /auth/forbidden
- [ ] Test list pages (should be accessible):
  - [ ] /people - **Expected:** Access granted, no admin actions visible
  - [ ] /bulletins - **Expected:** Access granted
  - [ ] /events - **Expected:** Access granted
- [ ] **Result:** ___________

### Test 2.6: Kiosk Access (Attendance Only)
- [ ] Sign in as **kiosk**
- [ ] Test attendance pages:
  - [ ] /attendance/new - **Expected:** Access granted
  - [ ] /attendance/[id] - **Expected:** Access granted
- [ ] Test all other creation pages (should be forbidden):
  - [ ] /bulletins/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /events/new - **Expected:** Redirect to /auth/forbidden
  - [ ] /people/new - **Expected:** Redirect to /auth/forbidden
- [ ] **Result:** ___________

---

## Test Suite 3: Detail Page Protection

### Test 3.1: Detail Page Access - Admin
- [ ] Sign in as **admin**
- [ ] Create a test bulletin (if none exist)
- [ ] Navigate to /bulletins/[id]
- [ ] **Expected:** Access granted, can edit/delete
- [ ] Repeat for:
  - [ ] /events/[id]
  - [ ] /announcements/[id]
  - [ ] /forms/[id]
  - [ ] /groups/[id]
  - [ ] /attendance/[id]
- [ ] **Result:** ___________

### Test 3.2: Detail Page Access - Submitter
- [ ] Sign in as **submitter**
- [ ] Navigate to /bulletins/[id]
- [ ] **Expected:** Redirect to /auth/forbidden (admin/editor only)
- [ ] Navigate to /events/[id]
- [ ] **Expected:** Access granted (admin/editor/submitter)
- [ ] Navigate to /announcements/[id]
- [ ] **Expected:** Access granted (admin/editor/submitter)
- [ ] **Result:** ___________

### Test 3.3: Detail Page Access - Viewer
- [ ] Sign in as **viewer**
- [ ] Navigate to any detail page
- [ ] **Expected:** Redirect to /auth/forbidden (viewers can't edit)
- [ ] **Result:** ___________

### Test 3.4: Detail Page Access - Kiosk
- [ ] Sign in as **kiosk**
- [ ] Navigate to /attendance/[id]
- [ ] **Expected:** Access granted (can check people in)
- [ ] Navigate to /bulletins/[id]
- [ ] **Expected:** Redirect to /auth/forbidden
- [ ] **Result:** ___________

---

## Test Suite 4: Navigation & UI Visibility

### Test 4.1: Navigation Menu Filtering - Admin
- [ ] Sign in as **admin**
- [ ] Check header navigation
- [ ] **Expected:** All menu items visible:
  - Dashboard, People, Events, Bulletins, Announcements, Donations, Forms, Groups, Attendance
- [ ] **Result:** ___________

### Test 4.2: Navigation Menu Filtering - Viewer
- [ ] Sign in as **viewer**
- [ ] Check header navigation
- [ ] **Expected:** Limited menu items (no creation links)
- [ ] **Result:** ___________

### Test 4.3: Navigation Menu Filtering - Kiosk
- [ ] Sign in as **kiosk**
- [ ] Check header navigation
- [ ] **Expected:** Only Attendance visible
- [ ] **Result:** ___________

### Test 4.4: Action Button Visibility - Submitter
- [ ] Sign in as **submitter**
- [ ] Navigate to /people
- [ ] **Expected:** "Add Person" button NOT visible
- [ ] Navigate to /events
- [ ] **Expected:** "Add Event" button visible (if exists)
- [ ] **Result:** ___________

---

## Test Suite 5: JWT Token & API Authentication

### Test 5.1: JWT Token Generation
- [ ] Sign in as admin
- [ ] Open browser DevTools > Network tab
- [ ] Look for request to `/api/auth/token`
- [ ] **Expected:** 200 OK response with JWT token
- [ ] **Expected:** Token stored in localStorage or sessionStorage
- [ ] **Result:** ___________

### Test 5.2: API Calls with JWT
- [ ] While logged in, navigate to /people
- [ ] Open DevTools > Network tab
- [ ] Look for tRPC API calls
- [ ] Check request headers
- [ ] **Expected:** Authorization header with Bearer token
- [ ] **Expected:** x-tenant-id header present
- [ ] **Result:** ___________

### Test 5.3: API Call Without Token
- [ ] Sign out completely
- [ ] Open DevTools > Console
- [ ] Try to manually call an API endpoint
- [ ] **Expected:** 401 Unauthorized error
- [ ] **Result:** ___________

---

## Test Suite 6: Error Handling & Edge Cases

### Test 6.1: Forbidden Page Display
- [ ] Sign in as **viewer**
- [ ] Try to access /bulletins/new
- [ ] **Expected:** Redirect to /auth/forbidden
- [ ] **Expected:** Friendly error page showing:
  - Current role
  - Link to dashboard
  - Link to contact admin
- [ ] **Result:** ___________

### Test 6.2: Loading States
- [ ] Sign in as admin
- [ ] Navigate to /people
- [ ] Observe page load
- [ ] **Expected:** "Loading..." message during authentication check
- [ ] **Expected:** Content appears after auth verified
- [ ] **Result:** ___________

### Test 6.3: Invalid Session
- [ ] Sign in as admin
- [ ] Manually delete session cookie (via DevTools)
- [ ] Try to navigate to /dashboard
- [ ] **Expected:** Redirect to /login
- [ ] **Result:** ___________

### Test 6.4: Expired JWT Token
- [ ] Sign in as admin
- [ ] Wait for token expiry (12 hours, or manually expire)
- [ ] Try to make API call
- [ ] **Expected:** Token refresh or re-authentication required
- [ ] **Result:** ___________

---

## Test Suite 7: Cross-Browser Testing

### Test 7.1: Chrome
- [ ] Repeat key tests in Chrome
- [ ] **Result:** ___________

### Test 7.2: Firefox
- [ ] Repeat key tests in Firefox
- [ ] **Result:** ___________

### Test 7.3: Edge
- [ ] Repeat key tests in Edge
- [ ] **Result:** ___________

---

## Issues Found

| # | Test | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 |      |       |          |        |
| 2 |      |       |          |        |
| 3 |      |       |          |        |

---

## Test Summary

- **Total Tests:** 50+
- **Passed:** ___
- **Failed:** ___
- **Blocked:** ___
- **Test Coverage:** ___% of authentication features

## Sign-Off

- [ ] All critical tests passed
- [ ] All issues documented
- [ ] Ready for Sprint 6 completion

**Tested By:** _______________
**Date:** _______________

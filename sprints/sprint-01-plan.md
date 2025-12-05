# Sprint 1 - Core Foundation Features

**Dates:** 2025-11-14 to 2025-11-27 (2 weeks)
**Goal:** Establish core functionality for bulletin generation and people management

---

## Sprint Goals

1. ✅ **Foundation Complete** - Monorepo, database, auth framework
2. 🎯 **Bulletin Generator MVP** - Basic intake and preview
3. 🎯 **People Management** - CRUD operations for persons and households
4. 🎯 **Authentication UI** - Login flow and protected routes

---

## User Stories

### 1. Bulletin Generator

**As a church admin, I want to create a bulletin issue so that I can start entering service information.**

**Acceptance Criteria:**
- [ ] Can create a new bulletin issue for a specific Sunday
- [ ] Can view list of bulletin issues (draft, approved, built, locked)
- [ ] Can enter basic service information (date, title)
- [ ] Can save as draft
- [ ] Status shows as "draft"

**Tasks:**
- [ ] Create `BulletinIssue` database table integration
- [ ] Build `/bulletins` list page
- [ ] Build `/bulletins/new` creation form
- [ ] Build `/bulletins/[id]` detail page
- [ ] Add tRPC router for bulletin operations

**Estimate:** 3 days

---

### 2. Service Items (Order of Service)

**As a church admin, I want to add service items to a bulletin so that I can build the order of service.**

**Acceptance Criteria:**
- [ ] Can add service items to a bulletin issue
- [ ] Can reorder service items (drag & drop or up/down)
- [ ] Can specify item type (Song, Prayer, Scripture, Sermon, etc.)
- [ ] Can add CCLI number for songs
- [ ] Validation: CCLI required for songs before lock

**Tasks:**
- [ ] Create `ServiceItem` CRUD operations
- [ ] Build service items form component
- [ ] Add drag-and-drop ordering
- [ ] Implement CCLI validation
- [ ] Add tRPC mutations

**Estimate:** 2 days

---

### 3. People Management

**As a church admin, I want to manage church members so that I can track who attends.**

**Acceptance Criteria:**
- [ ] Can view list of people
- [ ] Can search people by name, email
- [ ] Can create a new person
- [ ] Can edit person details
- [ ] Can assign person to a household
- [ ] Soft delete support

**Tasks:**
- [ ] Build `/people` list page with search
- [ ] Build `/people/new` creation form
- [ ] Build `/people/[id]` detail/edit page
- [ ] Implement search with PostgreSQL full-text
- [ ] Add household selector dropdown
- [ ] Connect to database via tRPC

**Estimate:** 2 days

---

### 4. Authentication UI

**As a user, I want to log in to the platform so that I can access church management features.**

**Acceptance Criteria:**
- [ ] Login page at `/login`
- [ ] Shows login form (email + password for dev)
- [ ] Redirects to dashboard after successful login
- [ ] Protected routes require authentication
- [ ] Can log out
- [ ] Shows user name and role in header

**Tasks:**
- [ ] Build `/login` page
- [ ] Create authentication context (dev mode)
- [ ] Add protected route wrapper
- [ ] Build app header with user info
- [ ] Add logout functionality
- [ ] Store JWT in localStorage/cookies

**Estimate:** 2 days

---

### 5. Dashboard Landing Page

**As a user, I want to see a dashboard when I log in so that I can navigate the platform.**

**Acceptance Criteria:**
- [ ] Dashboard shows at `/dashboard`
- [ ] Shows stats: upcoming events, active bulletins, member count
- [ ] Shows quick actions: Create Bulletin, Add Person, Create Event
- [ ] Elder-first design (large text, big buttons)

**Tasks:**
- [ ] Build `/dashboard` page
- [ ] Fetch and display stats from tRPC
- [ ] Create quick action cards
- [ ] Apply elder-first design system

**Estimate:** 1 day

---

## Technical Tasks

### Database
- [ ] Verify migrations run successfully
- [ ] Seed test data (1 tenant, 10 people, 2 bulletin issues)
- [ ] Test RLS policies

### Backend
- [ ] Implement bulletin tRPC router
- [ ] Implement people tRPC router
- [ ] Implement service items router
- [ ] Add input validation with Zod
- [ ] Add error handling

### Frontend
- [ ] Set up tRPC client
- [ ] Create reusable form components
- [ ] Create elder-first UI components (Button, Input, Card)
- [ ] Add loading states
- [ ] Add error boundaries

### Testing
- [ ] Manual testing of all CRUD operations
- [ ] Test RLS tenant isolation
- [ ] Test authentication flow

---

## Out of Scope (Future Sprints)

- Announcements
- Events & RSVP
- Bulletin rendering (PDF/slides)
- Messaging
- Giving
- Mobile app

---

## Sprint Ceremonies

**Daily Standup:** N/A (solo developer)

**Sprint Review:** 2025-11-27
- Demo bulletin creation flow
- Demo people management
- Demo authentication

**Sprint Retrospective:** 2025-11-27
- What went well?
- What could be improved?
- Action items for Sprint 2

---

## Definition of Done

- [ ] Code written and reviewed
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no errors
- [ ] Manually tested in browser
- [ ] Committed to git
- [ ] GitHub Actions CI passing

---

## Notes

- Focus on getting basic flows working end-to-end
- Don't worry about perfect UI polish yet
- Use placeholder data where needed
- Authentication is dev-only JWT for now (Azure AD B2C in Sprint 3)
- No tests yet (Testing phase later)

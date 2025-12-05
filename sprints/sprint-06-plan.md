# Sprint 6 - Authentication & Authorization

**Dates:** 2025-11-15 to 2025-11-29 (2 weeks)
**Goal:** Implement Azure AD B2C authentication with role-based access control

---

## Sprint Goals

1. 🎯 **Azure AD B2C Integration** - Production-ready authentication
2. 🎯 **Role-Based Access Control** - Admin, Editor, Submitter, Viewer, Kiosk roles
3. 🎯 **Protected Routes** - Secure all existing pages with proper authorization
4. 🎯 **Session Management** - Persistent sessions with refresh tokens
5. 🎯 **Remove Hardcoded Auth** - Replace all `isAdmin = true` flags

---

## User Stories

### 1. User Sign Up & Sign In

**As a church member, I want to sign up and sign in so that I can access the platform.**

**Acceptance Criteria:**
- [ ] Can sign up with email and password
- [ ] Receives email verification
- [ ] Can sign in with verified account
- [ ] Redirects to dashboard after successful login
- [ ] Shows error messages for invalid credentials
- [ ] Can sign out and session is cleared

**Tasks:**
- [ ] Create Azure AD B2C tenant (`elderfirstchurch.onmicrosoft.com`)
- [ ] Register application in Azure AD B2C
- [ ] Configure sign-up/sign-in user flow (`B2C_1_signupsignin`)
- [ ] Install NextAuth.js and dependencies
- [ ] Create NextAuth API route (`/api/auth/[...nextauth]/route.ts`)
- [ ] Create login page (`/login`)
- [ ] Update Header component with auth buttons
- [ ] Test sign-up and sign-in flows

**Estimate:** 3 days

---

### 2. Password Reset Flow

**As a user, I want to reset my password if I forget it so that I can regain access.**

**Acceptance Criteria:**
- [ ] "Forgot password" link on login page
- [ ] Redirects to Azure AD B2C password reset flow
- [ ] Receives password reset email
- [ ] Can set new password
- [ ] Redirects back to login after reset
- [ ] Can sign in with new password

**Tasks:**
- [ ] Configure password reset user flow in Azure AD B2C (`B2C_1_passwordreset`)
- [ ] Add "Forgot Password" link to login page
- [ ] Handle AADB2C90118 error code (forgot password)
- [ ] Handle AADB2C90091 error code (user cancelled)
- [ ] Create error handler page (`/auth/error`)
- [ ] Test password reset flow end-to-end

**Estimate:** 1 day

---

### 3. Role-Based Access Control (RBAC)

**As an admin, I want different users to have different permissions so that I can control who can do what.**

**Roles:**
- **Admin** - Full access to all features
- **Editor** - Can edit content, cannot manage users or settings
- **Submitter** - Can submit requests (prayers, forms), view limited data
- **Viewer** - Read-only access to most features
- **Kiosk** - Limited check-in/attendance functionality only

**Acceptance Criteria:**
- [ ] Roles stored in user profile (Azure AD B2C custom attributes or database)
- [ ] Role assigned during sign-up (default: Viewer)
- [ ] Admin can change user roles
- [ ] Session includes user role
- [ ] Protected routes check role before rendering
- [ ] Unauthorized users see "Access Denied" message

**Tasks:**
- [ ] Add custom attribute `extension_role` to Azure AD B2C user schema
- [ ] Create role assignment UI for admins (`/admin/users`)
- [ ] Create `useRole()` hook for checking user role
- [ ] Create `requireRole()` HOC for protecting pages
- [ ] Update tRPC context to include user role
- [ ] Add role checks to all existing pages
- [ ] Create "Access Denied" page (`/auth/forbidden`)

**Estimate:** 3 days

---

### 4. Secure Existing Pages

**As a user, I should only see pages and features I have permission to access.**

**Pages to Secure:**

| Page | Admin | Editor | Submitter | Viewer | Kiosk |
|------|-------|--------|-----------|--------|-------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| People (Admin View) | ✅ | ❌ | ❌ | ❌ | ❌ |
| People (Directory View) | ✅ | ✅ | ✅ | ✅ | ❌ |
| People → Add New | ✅ | ✅ | ❌ | ❌ | ❌ |
| Events | ✅ | ✅ | ✅ | ✅ | ❌ |
| Events → Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bulletins | ✅ | ✅ | ❌ | ✅ | ❌ |
| Bulletins → Edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Forms | ✅ | ✅ | ✅ | ✅ | ❌ |
| Forms → Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendance → Check-in | ✅ | ✅ | ✅ | ❌ | ✅ |
| Groups | ✅ | ✅ | ✅ | ✅ | ❌ |
| Donations | ✅ | ✅ | ❌ | ✅ | ❌ |
| Donations → Record | ✅ | ✅ | ❌ | ❌ | ❌ |
| Communications | ✅ | ✅ | ❌ | ❌ | ❌ |
| Prayers | ✅ | ✅ | ✅ | ✅ | ❌ |
| Prayers → Submit | ✅ | ✅ | ✅ | ❌ | ❌ |

**Acceptance Criteria:**
- [ ] All pages redirect to `/login` if not authenticated
- [ ] Pages check role and show "Access Denied" if insufficient permission
- [ ] "Add" buttons hidden for users without create permission
- [ ] "Edit" buttons hidden for users without edit permission
- [ ] Navigation menu only shows links user has access to

**Tasks:**
- [ ] Replace `isAdmin = true` in people/page.tsx with real role check
- [ ] Add role checks to all 26 existing pages
- [ ] Create role-based navigation filtering in Header.tsx
- [ ] Hide action buttons based on role (Add, Edit, Delete)
- [ ] Update tRPC routers to enforce role checks server-side
- [ ] Test each role's access to each page

**Estimate:** 3 days

---

### 5. Profile Management

**As a user, I want to view and edit my profile so that I can keep my information up-to-date.**

**Acceptance Criteria:**
- [ ] Profile page shows user's name, email, role
- [ ] Can edit display name, given name, surname
- [ ] Cannot edit email (must use Azure AD B2C flow)
- [ ] Cannot edit own role (only admins can)
- [ ] Changes saved to Azure AD B2C
- [ ] Session reflects updated information

**Tasks:**
- [ ] Configure profile editing user flow in Azure AD B2C (`B2C_1_profileediting`)
- [ ] Create profile page (`/profile`)
- [ ] Create profile edit form
- [ ] Add "Edit Profile" button in Header
- [ ] Test profile editing flow
- [ ] Update session after profile changes

**Estimate:** 2 days

---

## Technical Tasks

### Azure AD B2C Setup
- [ ] Create Azure AD B2C tenant
- [ ] Register application and note Client ID
- [ ] Create client secret and store in `.env.local`
- [ ] Configure redirect URIs (localhost and production)
- [ ] Create user flows: Sign up/sign in, Password reset, Profile editing
- [ ] Configure token lifetimes (1 hour access, 90 days refresh)
- [ ] Set up custom branding (optional)

### Backend (tRPC)
- [ ] Update `createContext()` to extract user from NextAuth session
- [ ] Add `userId` and `role` to all router contexts
- [ ] Add role validation middleware
- [ ] Update all mutations to check permissions
- [ ] Add user management router (assign roles)
- [ ] Add audit logging for role changes

### Frontend (Next.js)
- [ ] Install `next-auth` and `@auth/core`
- [ ] Create SessionProvider wrapper in root layout
- [ ] Create `useAuth()` hook
- [ ] Create `useRole()` hook
- [ ] Create `requireAuth()` HOC
- [ ] Create `requireRole()` HOC
- [ ] Update all pages to use auth hooks

### Environment Variables
```bash
# .env.local
AZURE_AD_B2C_TENANT_NAME=elderfirstchurch
AZURE_AD_B2C_CLIENT_ID=<from Azure>
AZURE_AD_B2C_CLIENT_SECRET=<from Azure>
AZURE_AD_B2C_PRIMARY_USER_FLOW=B2C_1_signupsignin
NEXTAUTH_URL=http://localhost:3045
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### Database
- [ ] Add `azure_ad_user_id` column to `person` table
- [ ] Create migration to link Azure AD users to person records
- [ ] Add `role_assignments` table for tracking role changes
- [ ] Add audit log entries for authentication events

### Testing
- [ ] Test sign-up flow (new user)
- [ ] Test sign-in flow (existing user)
- [ ] Test password reset flow
- [ ] Test profile editing flow
- [ ] Test each role's access to each page
- [ ] Test session persistence after refresh
- [ ] Test sign-out clears session
- [ ] Test CSRF protection
- [ ] Test XSS protection (input sanitization)

---

## Out of Scope (Future Sprints)

- Multi-factor authentication (MFA)
- Social login (Google, Facebook)
- Single Sign-On (SSO) for organizations
- Passwordless authentication (magic links)
- Biometric authentication (mobile app)
- Admin impersonation (sign in as user)

---

## Security Checklist

- [ ] Client secret stored in environment variables (not in code)
- [ ] NEXTAUTH_SECRET is cryptographically secure (32+ characters)
- [ ] HTTPS enforced on all auth endpoints in production
- [ ] Token expiration configured (1 hour access, 90 days refresh)
- [ ] CSRF protection enabled (NextAuth default)
- [ ] XSS protection (input sanitization, CSP headers)
- [ ] Rate limiting on auth endpoints (Azure AD B2C built-in)
- [ ] Session cookies set to httpOnly and secure
- [ ] No sensitive data in JWT payload
- [ ] Audit logging for authentication events

---

## Sprint Ceremonies

**Sprint Planning:** 2025-11-15 ✅
- Review Sprint 6 goals and stories
- Estimate tasks
- Assign work

**Daily Progress Updates:**
- Track progress using TodoWrite tool
- Update task statuses daily
- Note blockers or issues

**Sprint Review:** 2025-11-29
- Demo authentication flows
- Demo role-based access control
- Demo protected routes
- Show security measures

**Sprint Retrospective:** 2025-11-29
- What went well?
- What could be improved?
- Action items for Sprint 7

---

## Definition of Done

- [ ] Code written and reviewed
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no errors
- [ ] All authentication flows tested manually
- [ ] All roles tested on all pages
- [ ] Security checklist complete
- [ ] No hardcoded `isAdmin = true` remaining
- [ ] Committed to git
- [ ] Documentation updated

---

## Success Metrics

**Authentication:**
- ✅ Users can sign up, sign in, and sign out
- ✅ Password reset flow works end-to-end
- ✅ Profile editing works
- ✅ Sessions persist across page refreshes

**Authorization:**
- ✅ All 5 roles defined and functional
- ✅ All 26 pages have appropriate role checks
- ✅ Admin can assign roles to users
- ✅ Unauthorized access blocked with clear error message

**Security:**
- ✅ All items in security checklist complete
- ✅ No auth credentials in code
- ✅ Audit logging for authentication events

**Code Quality:**
- ✅ No hardcoded auth flags (`isAdmin = true`)
- ✅ Consistent use of auth hooks across codebase
- ✅ TypeScript strict mode with no errors

---

## Dependencies & Risks

**Dependencies:**
- Azure subscription (already exists)
- Azure AD B2C pricing tier (Free tier sufficient for V1)
- NextAuth.js v5 compatibility with Next.js 14

**Risks:**
- **Azure AD B2C configuration complexity** - Mitigation: Follow step-by-step guide in `docs/AZURE-AD-B2C-SETUP.md`
- **Session management issues** - Mitigation: Use NextAuth's proven session handling
- **Role mapping complexity** - Mitigation: Start with simple role enum, expand if needed
- **Breaking changes to existing pages** - Mitigation: Test thoroughly before merging

---

## Notes

- Follow Azure AD B2C setup guide: `docs/AZURE-AD-B2C-SETUP.md`
- Use NextAuth.js for session management (battle-tested)
- Store roles in custom Azure AD B2C attributes OR in database (decision: database for flexibility)
- Default role for new users: Viewer (least privilege)
- Admin users must be manually promoted (security)
- Session duration: 1 hour access token, 90 days refresh token
- Focus on security first, convenience second

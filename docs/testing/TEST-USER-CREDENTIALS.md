# Test User Credentials

**Important:** These are test accounts for Sprint 6 authentication testing only.

## How to Set Up Test Users

1. **Run the seed script:**
   ```bash
   # From project root
   psql -h localhost -U postgres -d elder_first -f scripts/seed-test-users.sql
   ```

2. **Configure NextAuth credentials:**
   Since we're using NextAuth with credentials provider, you'll need to sign in with these test accounts through the login page.

## Test Accounts

| Role | Email | Password | Person ID | Access Level |
|------|-------|----------|-----------|--------------|
| **Admin** | admin@test.com | (set via NextAuth) | test-admin-001 | Full access to all features |
| **Editor** | editor@test.com | (set via NextAuth) | test-editor-001 | Content management |
| **Submitter** | submitter@test.com | (set via NextAuth) | test-submitter-001 | Submit events, announcements, groups |
| **Viewer** | viewer@test.com | (set via NextAuth) | test-viewer-001 | Read-only access |
| **Kiosk** | kiosk@test.com | (set via NextAuth) | test-kiosk-001 | Attendance check-in only |

## Authentication Flow

Since we're using NextAuth with credentials provider, the test users work as follows:

1. **Login Page:** User enters email
2. **NextAuth:** Looks up person by email from database
3. **Role Assignment:** NextAuth fetches role from `RoleAssignment` table
4. **JWT Generation:** Role included in JWT token
5. **Session:** Role available in session for frontend
6. **API Calls:** JWT with role sent to tRPC API

## Expected Role Access

### Admin (admin@test.com)
- ✅ All `/new` form pages
- ✅ All `/[id]` detail pages
- ✅ All list pages
- ✅ Delete/Edit actions
- ✅ "Add" buttons visible

### Editor (editor@test.com)
- ✅ bulletins/new, donations/new, forms/new, people/new
- ✅ events/new, announcements/new, groups/new (with submitter)
- ✅ All corresponding detail pages
- ❌ attendance/new (kiosk only)

### Submitter (submitter@test.com)
- ✅ events/new, announcements/new, groups/new
- ✅ Corresponding detail pages
- ❌ bulletins/new, donations/new, forms/new, people/new
- ❌ attendance/new

### Viewer (viewer@test.com)
- ✅ List pages (read-only)
- ❌ All `/new` pages
- ❌ All `/[id]` edit pages
- ❌ No admin actions visible

### Kiosk (kiosk@test.com)
- ✅ attendance/new and attendance/[id]
- ❌ All other pages

## Troubleshooting

### "User not found" error
- Ensure seed script ran successfully
- Check database: `SELECT * FROM "Person" WHERE email LIKE '%@test.com';`

### "Unauthorized" error
- Check role assignment: `SELECT * FROM "RoleAssignment" WHERE person_id LIKE 'test-%';`
- Verify JWT token includes role in DevTools

### Session not persisting
- Check browser cookies
- Verify NEXTAUTH_SECRET is set in .env.local
- Check NextAuth configuration in apps/web/src/auth.ts

## Database Verification

```sql
-- Check test users exist
SELECT p.id, p.email, p.first_name, p.last_name
FROM "Person" p
WHERE p.email LIKE '%@test.com';

-- Check role assignments
SELECT ra.person_id, ra.role, p.email
FROM "RoleAssignment" ra
JOIN "Person" p ON ra.person_id = p.id
WHERE p.email LIKE '%@test.com';

-- Clean up test users (if needed)
DELETE FROM "RoleAssignment" WHERE person_id LIKE 'test-%';
DELETE FROM "Person" WHERE id LIKE 'test-%';
```

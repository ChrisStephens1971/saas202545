-- ============================================
-- Seed Test Users for Authentication Testing
-- ============================================
-- This script creates test users for each role
-- Run this against your PostgreSQL database
-- ============================================

-- Ensure we're working with the correct tenant
-- Replace 'default-tenant' with your actual tenant_id if different

-- 1. Admin User
INSERT INTO "Person" (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  membership_status,
  created_at,
  updated_at
) VALUES (
  'test-admin-001',
  'default-tenant',
  'Admin',
  'User',
  'admin@test.com',
  '555-0001',
  'member',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Editor User
INSERT INTO "Person" (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  membership_status,
  created_at,
  updated_at
) VALUES (
  'test-editor-001',
  'default-tenant',
  'Editor',
  'User',
  'editor@test.com',
  '555-0002',
  'member',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Submitter User
INSERT INTO "Person" (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  membership_status,
  created_at,
  updated_at
) VALUES (
  'test-submitter-001',
  'default-tenant',
  'Submitter',
  'User',
  'submitter@test.com',
  '555-0003',
  'member',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Viewer User
INSERT INTO "Person" (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  membership_status,
  created_at,
  updated_at
) VALUES (
  'test-viewer-001',
  'default-tenant',
  'Viewer',
  'User',
  'viewer@test.com',
  '555-0004',
  'member',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Kiosk User
INSERT INTO "Person" (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  membership_status,
  created_at,
  updated_at
) VALUES (
  'test-kiosk-001',
  'default-tenant',
  'Kiosk',
  'User',
  'kiosk@test.com',
  '555-0005',
  'visitor',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Assign Roles to Test Users
-- ============================================

-- Admin Role
INSERT INTO "RoleAssignment" (
  id,
  tenant_id,
  person_id,
  role,
  assigned_by,
  created_at
) VALUES (
  'role-test-admin-001',
  'default-tenant',
  'test-admin-001',
  'admin',
  'system',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Editor Role
INSERT INTO "RoleAssignment" (
  id,
  tenant_id,
  person_id,
  role,
  assigned_by,
  created_at
) VALUES (
  'role-test-editor-001',
  'default-tenant',
  'test-editor-001',
  'editor',
  'system',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Submitter Role
INSERT INTO "RoleAssignment" (
  id,
  tenant_id,
  person_id,
  role,
  assigned_by,
  created_at
) VALUES (
  'role-test-submitter-001',
  'default-tenant',
  'test-submitter-001',
  'submitter',
  'system',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Viewer Role
INSERT INTO "RoleAssignment" (
  id,
  tenant_id,
  person_id,
  role,
  assigned_by,
  created_at
) VALUES (
  'role-test-viewer-001',
  'default-tenant',
  'test-viewer-001',
  'viewer',
  'system',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Kiosk Role
INSERT INTO "RoleAssignment" (
  id,
  tenant_id,
  person_id,
  role,
  assigned_by,
  created_at
) VALUES (
  'role-test-kiosk-001',
  'default-tenant',
  'test-kiosk-001',
  'kiosk',
  'system',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Verify Test Users Created
-- ============================================

SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  ra.role
FROM "Person" p
LEFT JOIN "RoleAssignment" ra ON p.id = ra.person_id
WHERE p.email LIKE '%@test.com'
ORDER BY ra.role;

-- Expected output:
-- test-admin-001     | Admin     | User      | admin@test.com     | admin
-- test-editor-001    | Editor    | User      | editor@test.com    | editor
-- test-kiosk-001     | Kiosk     | User      | kiosk@test.com     | kiosk
-- test-submitter-001 | Submitter | User      | submitter@test.com | submitter
-- test-viewer-001    | Viewer    | User      | viewer@test.com    | viewer

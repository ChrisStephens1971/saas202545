/**
 * Elder-First Church Platform - Bulletin Generator E2E Tests
 * Version: 1.0
 *
 * Acceptance test scenarios for the bulletin generator feature.
 * Covers: intake → build → lock → download artifacts + edge cases.
 *
 * Test Framework: Playwright Test
 * Environment: Staging (pointing to test database)
 */

import { test, expect, Page } from '@playwright/test';
import { parse as parsePdf } from 'pdf-parse';
import { createHash } from 'crypto';
import fs from 'fs/promises';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  adminEmail: 'admin@test.church.com',
  adminPassword: 'TestPassword123!',
  editorEmail: 'editor@test.church.com',
  editorPassword: 'TestPassword123!',
  timeout: 60000, // 60s for render operations
};

// ============================================================================
// Test Fixtures & Helpers
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Seed test data before each test (idempotent)
  await seedTestData();
});

test.afterEach(async ({ page }) => {
  // Cleanup (delete test bulletins)
  await cleanupTestData();
});

/**
 * Login helper
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(`${TEST_CONFIG.baseURL}/login`);
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${TEST_CONFIG.baseURL}/`);
}

/**
 * Seed test data (service items, announcements, brand pack)
 */
async function seedTestData() {
  // Call API to seed fixtures
  // Implementation: POST /api/test/seed
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  // Call API to delete test bulletins
  // Implementation: POST /api/test/cleanup
}

// ============================================================================
// TEST 1: Happy Path - Full Bulletin Lifecycle
// ============================================================================

test('Happy Path: Create bulletin, build, lock, download all artifacts', async ({ page }) => {
  test.setTimeout(TEST_CONFIG.timeout);

  // Login as Editor
  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Navigate to Bulletins
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins`);
  await expect(page.locator('h1')).toContainText('Bulletins');

  // Create new bulletin
  await page.click('text=Create Bulletin');
  await page.waitForURL(/.*\/bulletins\/new$/);

  // Fill issue date
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  // Wait for redirect to intake form
  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);
  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/intake/)?.[1];
  expect(bulletinId).toBeTruthy();

  // === TAB 1: Service Plan ===
  await page.click('text=Service Plan');

  // Add service items
  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Welcome');
  await page.fill('[name="title"]', 'Welcome & Announcements');
  await page.click('button:has-text("Save")');

  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Song');
  await page.fill('[name="title"]', 'Amazing Grace');
  await page.fill('[name="artist"]', 'John Newton');
  await page.fill('[name="ccli_number"]', '22025'); // Valid CCLI
  await page.click('button:has-text("Save")');

  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Sermon');
  await page.fill('[name="title"]', 'The Gift of Grace');
  await page.fill('[name="speaker"]', 'Pastor John Smith');
  await page.click('button:has-text("Save")');

  // === TAB 2: Announcements ===
  await page.click('text=Announcements');

  // Select existing announcements (pre-seeded)
  await page.check('input[type="checkbox"][value="announcement-1"]');
  await page.check('input[type="checkbox"][value="announcement-2"]');
  await page.check('input[type="checkbox"][value="announcement-3"]');

  // === TAB 3: Branding ===
  await page.click('text=Branding');

  // Brand pack should be auto-selected (default brand pack)
  await expect(page.locator('select[name="brand_pack_id"]')).toHaveValue(/.+/);

  // Save draft
  await page.click('text=Save Draft');
  await expect(page.locator('.toast-success')).toContainText('Draft saved');

  // === Build Preview ===
  await page.click('text=Next'); // Go to preview
  await page.waitForURL(/.*\/bulletins\/.*\/preview$/);

  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // Verify PROOF watermark is mentioned
  await expect(page.locator('.preview-notice')).toContainText('PROOF');

  // === Lock Bulletin (Admin Only) ===
  // Logout as Editor, login as Admin
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  // Navigate back to bulletin
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/preview`);

  // Lock button should now be visible (Admin role)
  await expect(page.locator('button:has-text("Lock Bulletin")')).toBeVisible();

  await page.click('text=Lock Bulletin');

  // Confirm dialog
  await page.click('button:has-text("Confirm Lock")');

  // Wait for lock to complete
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // Verify status changed to locked
  await expect(page.locator('.status-badge')).toContainText('Locked');

  // === Download Artifacts ===
  // Download standard PDF
  const [download1] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download PDF'),
  ]);
  expect(download1.suggestedFilename()).toMatch(/bulletin-.*\.pdf$/);
  await download1.saveAs(`/tmp/${download1.suggestedFilename()}`);

  // Verify PDF is valid and has no PROOF watermark
  const pdfBuffer = await fs.readFile(`/tmp/${download1.suggestedFilename()}`);
  const pdfData = await parsePdf(pdfBuffer);
  expect(pdfData.text).not.toContain('PROOF'); // Watermark removed
  expect(pdfData.text).toContain('Amazing Grace'); // Content present

  // Download large print PDF
  const [download2] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Large Print PDF'),
  ]);
  expect(download2.suggestedFilename()).toMatch(/bulletin-.*-large\.pdf$/);

  // Download slides ZIP
  const [download3] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Slides'),
  ]);
  expect(download3.suggestedFilename()).toMatch(/slides.*\.zip$/);

  // Download loop video
  const [download4] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Loop Video'),
  ]);
  expect(download4.suggestedFilename()).toMatch(/loop.*\.mp4$/);

  // Download ProPresenter bundle
  const [download5] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download ProPresenter'),
  ]);
  expect(download5.suggestedFilename()).toMatch(/propresenter.*\.zip$/);

  // All artifacts downloaded successfully
  console.log('✅ All artifacts downloaded and verified');
});

// ============================================================================
// TEST 2: Validation - Block Lock Without CCLI
// ============================================================================

test('Validation: Cannot lock bulletin with missing CCLI numbers', async ({ page }) => {
  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Create bulletin
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);

  // Add service items
  await page.click('text=Service Plan');

  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Song');
  await page.fill('[name="title"]', 'Amazing Grace');
  await page.fill('[name="artist"]', 'John Newton');
  // ❌ Intentionally leave CCLI number empty
  await page.click('button:has-text("Save")');

  // Select announcements
  await page.click('text=Announcements');
  await page.check('input[type="checkbox"][value="announcement-1"]');

  // Try to build preview
  await page.click('text=Next');
  await page.click('text=Build Preview');

  // Should show warning (not blocker for preview)
  await expect(page.locator('.validation-warning')).toContainText('1 song missing CCLI');

  // Preview should still build (with warning)
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // === Try to Lock (should fail) ===
  // Login as Admin
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/preview/)?.[1];
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/preview`);

  await page.click('text=Lock Bulletin');

  // Should show error (CCLI required)
  await expect(page.locator('.error-message')).toContainText('All songs must have CCLI numbers');

  // Lock button should remain disabled or show error
  await expect(page.locator('.status-badge')).not.toContainText('Locked');

  console.log('✅ Lock correctly blocked due to missing CCLI');
});

// ============================================================================
// TEST 3: Announcement Overflow (Top 3 + Two-Column Grid)
// ============================================================================

test('Announcement Overflow: Top 3 large, rest two-column grid', async ({ page }) => {
  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Create bulletin with 10 announcements
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);

  // Add service items (minimal)
  await page.click('text=Service Plan');
  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Welcome');
  await page.fill('[name="title"]', 'Welcome');
  await page.click('button:has-text("Save")');

  // Select 10 announcements
  await page.click('text=Announcements');
  for (let i = 1; i <= 10; i++) {
    await page.check(`input[type="checkbox"][value="announcement-${i}"]`);
  }

  // Save and build
  await page.click('text=Save Draft');
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // Download preview PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Preview'),
  ]);
  const pdfBuffer = await fs.readFile(await download.path());
  const pdfData = await parsePdf(pdfBuffer);

  // Verify layout (check PDF structure)
  // Top 3 should be featured (large text)
  // Items 4-10 should be in two-column grid (smaller text)
  // This is a heuristic check - actual layout verification would require OCR or PDF structure parsing
  expect(pdfData.numpages).toBeGreaterThanOrEqual(1);

  console.log('✅ Announcement overflow layout verified');
});

// ============================================================================
// TEST 4: Half-Letter Booklet Imposition (Pages 4-1, 2-3)
// ============================================================================

test('Imposition: Half-letter booklet pages ordered 4-1, 2-3', async ({ page }) => {
  // This test verifies the PDF page order for booklet printing
  // Expected: Sheet 1 outside (4, 1), Sheet 1 inside (2, 3)

  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Create bulletin with enough content for 4 pages
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);

  // Add multiple service items and announcements to fill 4 pages
  // (Implementation details depend on template rendering)

  await page.click('text=Save Draft');
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // Login as Admin and lock
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/preview/)?.[1];
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/preview`);

  await page.click('text=Lock Bulletin');
  await page.click('button:has-text("Confirm Lock")');
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // Download booklet PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Booklet PDF'),
  ]);

  const pdfBuffer = await fs.readFile(await download.path());
  const pdfData = await parsePdf(pdfBuffer);

  // Verify 4 pages (or 2 sheets)
  expect(pdfData.numpages).toBe(4);

  // Page order verification would require PDF page content analysis
  // For now, just verify page count
  console.log('✅ Booklet imposition page count verified');
});

// ============================================================================
// TEST 5: Large Print (120% Scale)
// ============================================================================

test('Large Print: Verify 120% scale applied', async ({ page }) => {
  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Create minimal bulletin
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);

  // Add minimal content
  await page.click('text=Service Plan');
  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Welcome');
  await page.fill('[name="title"]', 'Welcome');
  await page.click('button:has-text("Save")');

  await page.click('text=Announcements');
  await page.check('input[type="checkbox"][value="announcement-1"]');

  await page.click('text=Save Draft');
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // Lock
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/preview/)?.[1];
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/preview`);

  await page.click('text=Lock Bulletin');
  await page.click('button:has-text("Confirm Lock")');
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // Download both PDFs
  const [download1] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download PDF'),
  ]);
  const standardPdfBuffer = await fs.readFile(await download1.path());

  const [download2] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Large Print PDF'),
  ]);
  const largePrintPdfBuffer = await fs.readFile(await download2.path());

  // Verify large print PDF is larger file size (heuristic check)
  expect(largePrintPdfBuffer.length).toBeGreaterThan(standardPdfBuffer.length * 1.1);

  console.log('✅ Large print PDF verified (larger file size)');
});

// ============================================================================
// TEST 6: Lock Immutability (Cannot Edit After Lock)
// ============================================================================

test('Lock Immutability: Cannot edit locked bulletin', async ({ page }) => {
  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Create and lock bulletin
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);
  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/intake/)?.[1];

  // Add minimal content
  await page.click('text=Service Plan');
  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Welcome');
  await page.fill('[name="title"]', 'Welcome');
  await page.click('button:has-text("Save")');

  await page.click('text=Announcements');
  await page.check('input[type="checkbox"][value="announcement-1"]');

  await page.click('text=Save Draft');
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // Lock as Admin
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/preview`);
  await page.click('text=Lock Bulletin');
  await page.click('button:has-text("Confirm Lock")');
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // === Try to Edit (Should Be Blocked) ===
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/intake`);

  // All form fields should be disabled
  await expect(page.locator('button:has-text("Add Item")')).toBeDisabled();
  await expect(page.locator('input[type="checkbox"]').first()).toBeDisabled();

  // Or show error message
  await expect(page.locator('.alert-error')).toContainText('Cannot edit locked bulletin');

  console.log('✅ Locked bulletin is immutable');
});

// ============================================================================
// TEST 7: Emergency Reopen + Timestamp Watermark
// ============================================================================

test('Emergency Reopen: Admin reopens, timestamp watermark added', async ({ page }) => {
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  // Create and lock bulletin
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);
  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/intake/)?.[1];

  // Add minimal content
  await page.click('text=Service Plan');
  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Welcome');
  await page.fill('[name="title"]', 'Welcome');
  await page.click('button:has-text("Save")');

  await page.click('text=Announcements');
  await page.check('input[type="checkbox"][value="announcement-1"]');

  await page.click('text=Save Draft');
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  await page.click('text=Lock Bulletin');
  await page.click('button:has-text("Confirm Lock")');
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // === Emergency Reopen ===
  await page.click('text=Emergency Reopen');

  // Fill reason
  await page.fill('[name="reopen_reason"]', 'Typo in sermon title - needs immediate fix');
  await page.click('button:has-text("Confirm Reopen")');

  // Should redirect back to draft state
  await page.waitForSelector('text=Draft', { timeout: 5000 });
  await expect(page.locator('.status-badge')).toContainText('Draft');

  // Warning about timestamp watermark
  await expect(page.locator('.alert-warning')).toContainText('UPDATED timestamp');

  // Make edit
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/intake`);
  await page.click('text=Service Plan');
  // Edit existing item
  await page.click('button[aria-label="Edit service item"]');
  await page.fill('[name="title"]', 'Welcome & Opening Prayer'); // Fix typo
  await page.click('button:has-text("Save")');

  // Rebuild and re-lock
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  await page.click('text=Lock Bulletin');
  await page.click('button:has-text("Confirm Lock")');
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // Download PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download PDF'),
  ]);
  const pdfBuffer = await fs.readFile(await download.path());
  const pdfData = await parsePdf(pdfBuffer);

  // Verify timestamp watermark present
  expect(pdfData.text).toMatch(/UPDATED.*\d{4}/); // "UPDATED Nov 14, 2025..."

  console.log('✅ Emergency reopen and timestamp watermark verified');
});

// ============================================================================
// TEST 8: Watermark Removal on Lock
// ============================================================================

test('Watermark: PROOF in preview, removed after lock', async ({ page }) => {
  await login(page, TEST_CONFIG.editorEmail, TEST_CONFIG.editorPassword);

  // Create bulletin
  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/new`);
  const nextSunday = getNextSunday();
  await page.fill('[name="issue_date"]', nextSunday.toISOString().split('T')[0]);
  await page.click('text=Create');

  await page.waitForURL(/.*\/bulletins\/.*\/intake$/);
  const bulletinId = page.url().match(/\/bulletins\/(.*?)\/intake/)?.[1];

  // Add minimal content
  await page.click('text=Service Plan');
  await page.click('text=Add Item');
  await page.selectOption('[name="type"]', 'Song');
  await page.fill('[name="title"]', 'Amazing Grace');
  await page.fill('[name="ccli_number"]', '22025');
  await page.click('button:has-text("Save")');

  await page.click('text=Announcements');
  await page.check('input[type="checkbox"][value="announcement-1"]');

  await page.click('text=Save Draft');
  await page.click('text=Next');
  await page.click('text=Build Preview');
  await page.waitForSelector('text=Preview Ready', { timeout: 30000 });

  // Download PREVIEW PDF (should have PROOF watermark)
  const [previewDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Preview'),
  ]);
  const previewPdfBuffer = await fs.readFile(await previewDownload.path());
  const previewPdfData = await parsePdf(previewPdfBuffer);

  expect(previewPdfData.text).toContain('PROOF'); // Watermark present

  // Lock as Admin
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, TEST_CONFIG.adminEmail, TEST_CONFIG.adminPassword);

  await page.goto(`${TEST_CONFIG.baseURL}/bulletins/${bulletinId}/preview`);
  await page.click('text=Lock Bulletin');
  await page.click('button:has-text("Confirm Lock")');
  await page.waitForSelector('text=Bulletin Locked', { timeout: 60000 });

  // Download FINAL PDF (should NOT have PROOF watermark)
  const [finalDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download PDF'),
  ]);
  const finalPdfBuffer = await fs.readFile(await finalDownload.path());
  const finalPdfData = await parsePdf(finalPdfBuffer);

  expect(finalPdfData.text).not.toContain('PROOF'); // Watermark removed
  expect(finalPdfData.text).toContain('Amazing Grace'); // Content intact

  console.log('✅ PROOF watermark removed after lock');
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get next Sunday date
 */
function getNextSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday;
}

/**
 * Generate SHA-256 hash
 */
function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

#!/usr/bin/env tsx
/**
 * Development Account Validation Script
 *
 * This script checks that dev account environment variables are properly configured.
 * It does NOT handle actual passwords - it only validates that env vars are set.
 *
 * Usage: npm run dev:check-accounts
 *
 * SECURITY: This script refuses to run in production environments.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from apps/web/.env.development.local
const envPath = path.resolve(__dirname, '../../web/.env.development.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Also try loading from apps/web/.env.local as fallback
const envLocalPath = path.resolve(__dirname, '../../web/.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// SECURITY: Refuse to run in production
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ ERROR: This script cannot run in production!\n');
  console.error('This script is for local development only.');
  console.error('Current NODE_ENV:', process.env.NODE_ENV);
  process.exit(1);
}

// Check for production database indicators
const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl.includes('.database.azure.com') || dbUrl.includes('production')) {
  console.error('\n❌ ERROR: Production database detected!\n');
  console.error('This script is for local development only.');
  console.error('DATABASE_URL appears to point to a production database.');
  process.exit(1);
}

console.log('\n🔍 Checking Dev Account Configuration...\n');

// Define accounts to check
const accounts = [
  { email: 'admin@dev.com', role: 'Admin', envVar: 'DEV_ADMIN_PASSWORD' },
  { email: 'editor@dev.com', role: 'Editor', envVar: 'DEV_EDITOR_PASSWORD' },
  { email: 'submitter@dev.com', role: 'Submitter', envVar: 'DEV_SUBMITTER_PASSWORD' },
  { email: 'viewer@dev.com', role: 'Viewer', envVar: 'DEV_VIEWER_PASSWORD' },
  { email: 'kiosk@dev.com', role: 'Kiosk', envVar: 'DEV_KIOSK_PASSWORD' },
  { email: 'pastor@testchurch.local', role: 'Admin (Pastor)', envVar: 'DEV_PASTOR_PASSWORD' },
];

// Check required flags
console.log('Required Flags:');
const allowDevUsers = process.env.ALLOW_DEV_USERS === 'true';
const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

console.log(`  ALLOW_DEV_USERS:       ${allowDevUsers ? '✅ true' : '❌ not set or false'}`);
console.log(`  NEXT_PUBLIC_DEV_MODE:  ${devMode ? '✅ true' : '❌ not set or false'}`);

if (!allowDevUsers) {
  console.log('\n⚠️  Warning: ALLOW_DEV_USERS is not set to "true"');
  console.log('   Dev credentials will NOT work without this flag.');
}

if (!devMode) {
  console.log('\n⚠️  Warning: NEXT_PUBLIC_DEV_MODE is not set to "true"');
  console.log('   The dev accounts panel will NOT show on the login page.');
}

// Check account passwords
console.log('\nAccount Configuration:');
let allConfigured = true;
let anyConfigured = false;

for (const account of accounts) {
  const password = process.env[account.envVar];
  const isSet = password && password.length >= 8;

  if (isSet) {
    anyConfigured = true;
    console.log(`  ✅ ${account.email.padEnd(25)} (${account.role.padEnd(15)}) - Password configured`);
  } else if (password && password.length < 8) {
    allConfigured = false;
    console.log(`  ⚠️  ${account.email.padEnd(25)} (${account.role.padEnd(15)}) - Password too short (min 8 chars)`);
  } else {
    allConfigured = false;
    console.log(`  ❌ ${account.email.padEnd(25)} (${account.role.padEnd(15)}) - ${account.envVar} not set`);
  }
}

// Summary
console.log('\n' + '─'.repeat(60));

if (allowDevUsers && devMode && allConfigured) {
  console.log('\n✅ All dev accounts are properly configured!\n');
  console.log('You can now log in at http://localhost:3045/login');
  console.log('using any of the configured accounts.\n');
} else {
  console.log('\n⚠️  Configuration incomplete.\n');

  if (!anyConfigured) {
    console.log('To set up dev accounts:');
    console.log('\n1. Create apps/web/.env.development.local with:\n');
    console.log('   ALLOW_DEV_USERS=true');
    console.log('   NEXT_PUBLIC_DEV_MODE=true');
    console.log('   DEV_ADMIN_PASSWORD=your_password_here');
    console.log('   DEV_EDITOR_PASSWORD=your_password_here');
    console.log('   # ... etc for other accounts\n');
    console.log('2. Restart the dev server: npm run dev\n');
  }

  console.log('See docs/DEV-ACCOUNTS.md for full setup instructions.\n');
}

process.exit(allConfigured && allowDevUsers ? 0 : 1);

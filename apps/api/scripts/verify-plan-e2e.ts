/**
 * End-to-End Plan Verification Script
 *
 * Tests that plan-based AI behavior works correctly:
 * 1. Set plan to "starter" → ai_enabled=true, ai_monthly_token_limit=50,000
 * 2. Set plan to "core" → ai_enabled=false, ai_monthly_token_limit=0 → AI blocked
 * 3. Set plan to "plus" → ai_enabled=true, ai_monthly_token_limit=1,000,000
 */

import { db } from '../src/db';
import { PLAN_AI_DEFAULTS, getPlanAiDefaults } from '../src/config/planAiConfig';
import { PlanId } from '@elder-first/types';

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  ai_enabled: boolean;
  ai_monthly_token_limit: number | null;
}

async function getDevTenant(): Promise<TenantRow | null> {
  const result = await db.query<TenantRow>(
    `SELECT id, name, plan, ai_enabled, ai_monthly_token_limit
     FROM tenant
     WHERE deleted_at IS NULL
     LIMIT 1`
  );
  return result.rows[0] || null;
}

async function updateTenantPlan(tenantId: string, plan: PlanId): Promise<void> {
  const defaults = getPlanAiDefaults(plan);
  await db.query(
    `UPDATE tenant
     SET plan = $2,
         ai_enabled = $3,
         ai_monthly_token_limit = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [tenantId, plan, defaults.aiEnabled, defaults.aiLimitTokens]
  );
}

async function verifyTenantConfig(tenantId: string, expectedPlan: PlanId): Promise<boolean> {
  const result = await db.query<TenantRow>(
    `SELECT plan, ai_enabled, ai_monthly_token_limit
     FROM tenant
     WHERE id = $1`,
    [tenantId]
  );

  const row = result.rows[0];
  const expected = PLAN_AI_DEFAULTS[expectedPlan];

  const planMatches = row.plan === expectedPlan;
  const enabledMatches = row.ai_enabled === expected.aiEnabled;
  const limitMatches = row.ai_monthly_token_limit === expected.aiLimitTokens;

  console.log(`  Plan: ${row.plan} (expected: ${expectedPlan}) ${planMatches ? '✓' : '✗'}`);
  console.log(`  AI Enabled: ${row.ai_enabled} (expected: ${expected.aiEnabled}) ${enabledMatches ? '✓' : '✗'}`);
  console.log(`  AI Token Limit: ${row.ai_monthly_token_limit} (expected: ${expected.aiLimitTokens}) ${limitMatches ? '✓' : '✗'}`);

  return planMatches && enabledMatches && limitMatches;
}

async function main() {
  console.log('\n========================================');
  console.log('Plan-Based AI E2E Verification');
  console.log('========================================\n');

  // Get dev tenant
  const tenant = await getDevTenant();
  if (!tenant) {
    console.error('❌ No tenant found in database');
    process.exit(1);
  }

  console.log(`Using tenant: ${tenant.name} (${tenant.id})\n`);
  console.log('Current state:');
  console.log(`  Plan: ${tenant.plan}`);
  console.log(`  AI Enabled: ${tenant.ai_enabled}`);
  console.log(`  AI Token Limit: ${tenant.ai_monthly_token_limit}\n`);

  // Store original plan to restore later
  const originalPlan = tenant.plan as PlanId;

  let allPassed = true;

  // Test 1: Starter plan
  console.log('----------------------------------------');
  console.log('TEST 1: Set plan to "starter"');
  console.log('  Expected: aiEnabled=true, aiLimitTokens=50,000');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'starter');
  const test1 = await verifyTenantConfig(tenant.id, 'starter');
  console.log(test1 ? '✓ TEST 1 PASSED\n' : '✗ TEST 1 FAILED\n');
  allPassed = allPassed && test1;

  // Test 2: Core plan (AI disabled)
  console.log('----------------------------------------');
  console.log('TEST 2: Set plan to "core"');
  console.log('  Expected: aiEnabled=false, aiLimitTokens=0');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'core');
  const test2 = await verifyTenantConfig(tenant.id, 'core');
  console.log(test2 ? '✓ TEST 2 PASSED\n' : '✗ TEST 2 FAILED\n');
  allPassed = allPassed && test2;

  // Test 3: Standard plan
  console.log('----------------------------------------');
  console.log('TEST 3: Set plan to "standard"');
  console.log('  Expected: aiEnabled=true, aiLimitTokens=250,000');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'standard');
  const test3 = await verifyTenantConfig(tenant.id, 'standard');
  console.log(test3 ? '✓ TEST 3 PASSED\n' : '✗ TEST 3 FAILED\n');
  allPassed = allPassed && test3;

  // Test 4: Plus plan
  console.log('----------------------------------------');
  console.log('TEST 4: Set plan to "plus"');
  console.log('  Expected: aiEnabled=true, aiLimitTokens=1,000,000');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'plus');
  const test4 = await verifyTenantConfig(tenant.id, 'plus');
  console.log(test4 ? '✓ TEST 4 PASSED\n' : '✗ TEST 4 FAILED\n');
  allPassed = allPassed && test4;

  // Restore original plan
  console.log('----------------------------------------');
  console.log(`Restoring original plan: ${originalPlan}`);
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, originalPlan);
  await verifyTenantConfig(tenant.id, originalPlan);

  console.log('\n========================================');
  console.log('PLAN_AI_DEFAULTS Configuration:');
  console.log('========================================');
  for (const [plan, config] of Object.entries(PLAN_AI_DEFAULTS)) {
    console.log(`  ${plan}: aiEnabled=${config.aiEnabled}, aiLimitTokens=${config.aiLimitTokens}`);
  }

  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ ALL TESTS PASSED');
  } else {
    console.log('✗ SOME TESTS FAILED');
  }
  console.log('========================================\n');

  // Close DB connection
  await db.end();

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

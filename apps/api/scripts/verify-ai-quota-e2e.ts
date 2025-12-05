/**
 * End-to-End AI Quota Verification Script
 *
 * Tests that AI quota enforcement works with plan-based settings:
 * 1. With "core" plan (AI disabled): AI calls should be FORBIDDEN
 * 2. With "starter" plan (AI enabled): AI calls should succeed (if API key configured)
 * 3. With "plus" plan (AI enabled): AI calls should succeed
 */

import { db } from '../src/db';
import { getPlanAiDefaults } from '../src/config/planAiConfig';
import { PlanId } from '@elder-first/types';
import { getAiQuotaStatusForTenant } from '../src/utils/aiQuota';

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  ai_enabled: boolean;
  ai_monthly_token_limit: number | null;
}

// Mock context for quota check
function createMockContext(tenantId: string) {
  return {
    tenantId,
    userId: 'test-user',
    userRole: 'Admin' as const,
    // Test script doesn't use req/res, so we use minimal typed objects
    req: {} as Record<string, unknown>,
    res: {} as Record<string, unknown>,
  };
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

async function main() {
  console.log('\n========================================');
  console.log('AI Quota Enforcement E2E Verification');
  console.log('========================================\n');

  // Get dev tenant
  const tenant = await getDevTenant();
  if (!tenant) {
    console.error('❌ No tenant found in database');
    process.exit(1);
  }

  console.log(`Using tenant: ${tenant.name} (${tenant.id})\n`);

  // Store original plan to restore later
  const originalPlan = tenant.plan as PlanId;
  let allPassed = true;

  // Test 1: Core plan - AI should be disabled
  console.log('----------------------------------------');
  console.log('TEST 1: Core plan - AI quota check');
  console.log('  Expected: enabled=false, overLimit=true');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'core');
  const coreCtx = createMockContext(tenant.id);
  const coreQuota = await getAiQuotaStatusForTenant(coreCtx);
  console.log(`  enabled: ${coreQuota.enabled} (expected: false) ${!coreQuota.enabled ? '✓' : '✗'}`);
  console.log(`  overLimit: ${coreQuota.overLimit} (expected: true) ${coreQuota.overLimit ? '✓' : '✗'}`);
  console.log(`  limitTokens: ${coreQuota.limitTokens} (expected: 0)`);
  const test1 = !coreQuota.enabled && coreQuota.overLimit;
  console.log(test1 ? '✓ TEST 1 PASSED\n' : '✗ TEST 1 FAILED\n');
  allPassed = allPassed && test1;

  // Test 2: Starter plan - AI should be enabled with 50k limit
  console.log('----------------------------------------');
  console.log('TEST 2: Starter plan - AI quota check');
  console.log('  Expected: enabled=true, limitTokens=50000');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'starter');
  const starterCtx = createMockContext(tenant.id);
  const starterQuota = await getAiQuotaStatusForTenant(starterCtx);
  console.log(`  enabled: ${starterQuota.enabled} (expected: true) ${starterQuota.enabled ? '✓' : '✗'}`);
  console.log(`  limitTokens: ${starterQuota.limitTokens} (expected: 50000) ${starterQuota.limitTokens === 50000 ? '✓' : '✗'}`);
  console.log(`  overLimit: ${starterQuota.overLimit} (should be false if under limit)`);
  const test2 = starterQuota.enabled && starterQuota.limitTokens === 50000;
  console.log(test2 ? '✓ TEST 2 PASSED\n' : '✗ TEST 2 FAILED\n');
  allPassed = allPassed && test2;

  // Test 3: Standard plan - AI should be enabled with 250k limit
  console.log('----------------------------------------');
  console.log('TEST 3: Standard plan - AI quota check');
  console.log('  Expected: enabled=true, limitTokens=250000');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'standard');
  const standardCtx = createMockContext(tenant.id);
  const standardQuota = await getAiQuotaStatusForTenant(standardCtx);
  console.log(`  enabled: ${standardQuota.enabled} (expected: true) ${standardQuota.enabled ? '✓' : '✗'}`);
  console.log(`  limitTokens: ${standardQuota.limitTokens} (expected: 250000) ${standardQuota.limitTokens === 250000 ? '✓' : '✗'}`);
  const test3 = standardQuota.enabled && standardQuota.limitTokens === 250000;
  console.log(test3 ? '✓ TEST 3 PASSED\n' : '✗ TEST 3 FAILED\n');
  allPassed = allPassed && test3;

  // Test 4: Plus plan - AI should be enabled with 1M limit
  console.log('----------------------------------------');
  console.log('TEST 4: Plus plan - AI quota check');
  console.log('  Expected: enabled=true, limitTokens=1000000');
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, 'plus');
  const plusCtx = createMockContext(tenant.id);
  const plusQuota = await getAiQuotaStatusForTenant(plusCtx);
  console.log(`  enabled: ${plusQuota.enabled} (expected: true) ${plusQuota.enabled ? '✓' : '✗'}`);
  console.log(`  limitTokens: ${plusQuota.limitTokens} (expected: 1000000) ${plusQuota.limitTokens === 1000000 ? '✓' : '✗'}`);
  const test4 = plusQuota.enabled && plusQuota.limitTokens === 1000000;
  console.log(test4 ? '✓ TEST 4 PASSED\n' : '✗ TEST 4 FAILED\n');
  allPassed = allPassed && test4;

  // Restore original plan
  console.log('----------------------------------------');
  console.log(`Restoring original plan: ${originalPlan}`);
  console.log('----------------------------------------');
  await updateTenantPlan(tenant.id, originalPlan);

  console.log('\n========================================');
  if (allPassed) {
    console.log('✓ ALL QUOTA TESTS PASSED');
  } else {
    console.log('✗ SOME QUOTA TESTS FAILED');
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

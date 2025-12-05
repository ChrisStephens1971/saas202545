'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

/**
 * Format a number with locale-specific thousands separators.
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format cost with appropriate decimal places.
 * Small amounts get more precision.
 */
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format ISO date string to readable format.
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate tenant ID for display.
 */
function truncateTenantId(tenantId: string): string {
  if (tenantId.length > 12) {
    return tenantId.substring(0, 8) + '...';
  }
  return tenantId;
}

export default function AIUsagePage() {
  const { data: usage, isLoading, error, refetch } = trpc.adminAiUsage.currentMonth.useQuery();
  const { data: quota, isLoading: quotaLoading } = trpc.adminAiUsage.quotaForCurrentTenant.useQuery();

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin']}>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  if (error) {
    return (
      <ProtectedPage requiredRoles={['admin']}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">AI Usage</h1>
                <p className="text-lg text-gray-600">View AI feature usage and costs</p>
              </div>
              <Link href="/settings/ai">
                <Button variant="secondary">Back to AI Settings</Button>
              </Link>
            </div>
          </div>

          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Usage Data</h3>
            <p className="text-red-600 mb-4">{error.message}</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  const hasData = usage && usage.rows.length > 0;

  return (
    <ProtectedPage requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Usage</h1>
              <p className="text-lg text-gray-600">
                Current month usage and estimated costs
              </p>
            </div>
            <Link href="/settings/ai">
              <Button variant="secondary">Back to AI Settings</Button>
            </Link>
          </div>
        </div>

        {/* Date Range */}
        {usage && (
          <div className="mb-6 text-sm text-gray-600">
            Showing data from <strong>{formatDate(usage.from)}</strong> to{' '}
            <strong>{formatDate(usage.to)}</strong>
          </div>
        )}

        {/* Quota Section */}
        {!quotaLoading && quota && (
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monthly Quota</CardTitle>
                  <CardDescription>
                    AI token usage limit for this month
                  </CardDescription>
                </div>
                {quota.overLimit && (
                  <span className="px-3 py-1 text-sm font-semibold text-white bg-red-600 rounded-full">
                    Over limit
                  </span>
                )}
                {!quota.enabled && (
                  <span className="px-3 py-1 text-sm font-semibold text-white bg-gray-600 rounded-full">
                    AI Disabled
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {quota.limitTokens === null ? (
                <p className="text-gray-600">
                  No monthly AI token limit configured. Usage is unlimited.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Usage: <strong>{formatNumber(quota.usedTokens)}</strong> / {formatNumber(quota.limitTokens)} tokens
                    </span>
                    <span className="text-gray-500">
                      {quota.remainingTokens !== null && (
                        <>{formatNumber(quota.remainingTokens)} remaining</>
                      )}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        quota.overLimit
                          ? 'bg-red-600'
                          : quota.usedTokens / quota.limitTokens > 0.8
                          ? 'bg-amber-500'
                          : 'bg-primary-600'
                      }`}
                      style={{
                        width: `${Math.min((quota.usedTokens / quota.limitTokens) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {Math.round((quota.usedTokens / quota.limitTokens) * 100)}% of monthly limit used
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Unknown Models Warning */}
        {usage && usage.unknownModels.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-1">Unknown Models Detected</h3>
            <p className="text-amber-700 text-sm mb-2">
              The following models were used but don&apos;t have pricing configured (cost shown as $0):
            </p>
            <ul className="text-sm text-amber-700 list-disc list-inside">
              {usage.unknownModels.map((model) => (
                <li key={model}>{model}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Total API Calls</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(usage?.totals.calls ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Input Tokens</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(usage?.totals.tokensIn ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Output Tokens</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(usage?.totals.tokensOut ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Estimated Cost</p>
              <p className="text-3xl font-bold text-primary-600">
                {formatCost(usage?.totals.costInUSD ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Table */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Usage by Feature</CardTitle>
            <CardDescription>
              Breakdown of AI usage by tenant and feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <div className="py-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No usage data yet</h3>
                <p className="text-gray-500">
                  AI usage will appear here once AI features are used.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Feature
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Calls
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens In
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens Out
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usage.rows.map((row, idx) => (
                      <tr key={`${row.tenantId}-${row.feature}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {truncateTenantId(row.tenantId)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.feature}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.calls)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.tokensIn)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.tokensOut)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCost(row.costInUSD)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(usage.totals.calls)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(usage.totals.tokensIn)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(usage.totals.tokensOut)}
                      </td>
                      <td className="px-4 py-3 text-sm text-primary-600 text-right">
                        {formatCost(usage.totals.costInUSD)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card variant="outlined" className="mt-6">
          <CardHeader>
            <CardTitle>About AI Usage Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Tracking:</strong> Every AI API call is logged with token counts and model information.
              </p>
              <p>
                <strong>Cost Calculation:</strong> Costs are estimated using OpenAI&apos;s published pricing.
                Actual invoiced amounts may vary slightly.
              </p>
              <p>
                <strong>Data Retention:</strong> Usage data is retained for billing and auditing purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}

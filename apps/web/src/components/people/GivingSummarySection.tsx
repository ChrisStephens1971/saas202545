'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRole } from '@/hooks/useAuth';

interface GivingSummarySectionProps {
  personId: string;
  personName: string;
}

export function GivingSummarySection({ personId, personName }: GivingSummarySectionProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showFundBreakdown, setShowFundBreakdown] = useState(false);
  const { hasRole } = useRole();

  // Only admin/editor roles can view tax statements
  const canViewTaxStatement = hasRole(['admin', 'editor']);

  const { data: taxSummary, isLoading, error } = trpc.donations.getTaxSummaryByPerson.useQuery({
    personId,
    year: selectedYear,
    includeFundBreakdown: showFundBreakdown,
  });

  // Generate year options (current year and past 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  // Extract totals with fallback for backward compatibility
  // The API returns totalAmount; tax-deductible vs non-tax-deductible breakdown may not exist in all versions
  const totalTaxDeductible = (taxSummary as { totalTaxDeductibleAmount?: number })?.totalTaxDeductibleAmount ?? taxSummary?.totalAmount ?? 0;
  const totalNonTaxDeductible = (taxSummary as { totalNonTaxDeductibleAmount?: number })?.totalNonTaxDeductibleAmount ?? 0;
  const hasAnyContributions = totalTaxDeductible > 0 || totalNonTaxDeductible > 0;

  return (
    <Card variant="elevated" className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Giving Summary</CardTitle>
          <div className="flex items-center gap-3">
            <label className="text-base font-medium">Year:</label>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <Button
              variant={showFundBreakdown ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFundBreakdown(!showFundBreakdown)}
            >
              {showFundBreakdown ? 'Hide' : 'Show'} Fund Breakdown
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-gray-600">Loading giving summary...</p>
        ) : error ? (
          <p className="text-red-600">Failed to load giving summary.</p>
        ) : !hasAnyContributions ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              No contributions found for {selectedYear}.
            </p>
            {/* View Tax Statement Button (admin/editor only) - still visible even with $0 */}
            {canViewTaxStatement && (
              <Link href={`/donations/tax-statements/${selectedYear}/${personId}`}>
                <Button variant="secondary" size="sm">
                  View Tax Statement
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Giving Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax-Deductible Amount */}
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  Tax-Deductible Giving ({selectedYear})
                </p>
                <p className="text-2xl font-bold text-primary-800">
                  {formatCurrency(totalTaxDeductible, taxSummary?.currency ?? 'USD')}
                </p>
              </div>

              {/* Non-Tax-Deductible Amount */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  Non-Tax-Deductible Giving ({selectedYear})
                </p>
                <p className="text-2xl font-bold text-gray-700">
                  {formatCurrency(totalNonTaxDeductible, taxSummary?.currency ?? 'USD')}
                </p>
              </div>
            </div>

            {/* Person Name */}
            <p className="text-sm text-gray-500">
              For {personName}
            </p>

            {/* View Tax Statement Button (admin/editor only) */}
            {canViewTaxStatement && (
              <div className="pt-2">
                <Link href={`/donations/tax-statements/${selectedYear}/${personId}`}>
                  <Button variant="secondary" size="sm">
                    View Tax Statement
                  </Button>
                </Link>
              </div>
            )}

            {/* Fund Breakdown Table (Tax-Deductible Only) */}
            {showFundBreakdown && taxSummary?.fundBreakdown && taxSummary.fundBreakdown.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Tax-Deductible Breakdown by Fund</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Fund Name
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {taxSummary.fundBreakdown.map((fund: { fundId?: string; fundName: string; totalAmount: number }, index: number) => (
                        <tr key={fund.fundId ?? index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-base">
                            {fund.fundName || 'General Fund'}
                          </td>
                          <td className="px-4 py-3 text-base text-right font-medium">
                            {formatCurrency(fund.totalAmount, taxSummary.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Fund Breakdown Message */}
            {showFundBreakdown && (!taxSummary?.fundBreakdown || taxSummary.fundBreakdown.length === 0) && (
              <p className="text-gray-600 text-center py-4">
                No tax-deductible fund breakdown available for this year.
              </p>
            )}

            {/* Information Note */}
            <div className="text-sm text-gray-500 mt-4">
              <p>
                Fund breakdown shows tax-deductible contributions only.
                All amounts are for completed donations.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

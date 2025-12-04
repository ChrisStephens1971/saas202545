'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function DonationsPage() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled' | undefined>(undefined);

  const { data, isLoading, error } = trpc.donations.list.useQuery({
    status: statusFilter,
    limit: 50,
    offset: 0,
  });

  const { data: stats } = trpc.donations.getStats.useQuery({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading donations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading donations: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const donations = data?.donations || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Giving & Donations</h1>
        <div className="flex gap-3">
          <Link href="/donations/campaigns">
            <Button variant="secondary" size="lg">
              Campaigns
            </Button>
          </Link>
          <Link href="/donations/new">
            <Button size="lg">Record Donation</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-primary-600">
                ${parseFloat(stats.total_amount).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-2">Total This Year</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-green-600">{stats.donation_count}</p>
              <p className="text-sm text-gray-600 mt-2">Donations</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-blue-600">{stats.unique_donors}</p>
              <p className="text-sm text-gray-600 mt-2">Unique Donors</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-purple-600">
                ${parseFloat(stats.avg_donation).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Average Gift</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-6 max-w-2xl">
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value as any || undefined)}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {donations.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {statusFilter
                ? `No ${statusFilter} donations found`
                : 'No donations yet. Record your first donation to get started.'}
            </p>
            <Link href="/donations/new">
              <Button size="lg">Record First Donation</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {donations.map((donation: any) => (
            <Link href={`/donations/${donation.id}`} key={donation.id}>
              <Card
                variant="elevated"
                className="hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          ${parseFloat(donation.amount).toFixed(2)}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            donation.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : donation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-base text-gray-600 mb-2">
                        {donation.first_name && donation.last_name
                          ? `${donation.first_name} ${donation.last_name}`
                          : donation.donor_name || 'Anonymous'}
                        {' • '}
                        {new Date(donation.donation_date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{donation.donation_method.replace('_', ' ')}</span>
                        {donation.campaign_name && <span>Campaign: {donation.campaign_name}</span>}
                        {donation.fund_name && <span>Fund: {donation.fund_name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.total > data.donations.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - data.donations.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

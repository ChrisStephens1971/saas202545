'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function CampaignsPage() {
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const { data, isLoading, error } = trpc.donations.listCampaigns.useQuery({
    isActive: activeFilter,
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading campaigns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading campaigns: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Fundraising Campaigns</h1>
        <div className="flex gap-3">
          <Link href="/donations">
            <Button variant="secondary" size="lg">
              Back to Donations
            </Button>
          </Link>
          <Link href="/donations/campaigns/new">
            <Button size="lg">Create Campaign</Button>
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 max-w-2xl">
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          value={activeFilter === undefined ? '' : activeFilter.toString()}
          onChange={(e) =>
            setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true')
          }
        >
          <option value="">All Campaigns</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {campaigns.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              No campaigns yet. Create your first fundraising campaign to get started.
            </p>
            <Link href="/donations/campaigns/new">
              <Button size="lg">Create First Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => {
            const progress = campaign.goal_amount
              ? (parseFloat(campaign.total_raised) / parseFloat(campaign.goal_amount)) * 100
              : 0;

            return (
              <Link href={`/donations/campaigns/${campaign.id}`} key={campaign.id}>
                <Card
                  variant="elevated"
                  className="hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{campaign.name}</h3>
                          {campaign.is_active ? (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        {campaign.description && (
                          <p className="text-base text-gray-600 mb-3">{campaign.description}</p>
                        )}

                        {campaign.goal_amount && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">
                                ${parseFloat(campaign.total_raised).toLocaleString()} raised
                              </span>
                              <span className="text-gray-600">
                                Goal: ${parseFloat(campaign.goal_amount).toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{Math.round(progress)}% of goal</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{campaign.donation_count} donations</span>
                          {campaign.start_date && (
                            <span>
                              Starts: {new Date(campaign.start_date).toLocaleDateString()}
                            </span>
                          )}
                          {campaign.end_date && (
                            <span>Ends: {new Date(campaign.end_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Button variant="outline" size="sm">
                          View Campaign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {data && data.total > data.campaigns.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - data.campaigns.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

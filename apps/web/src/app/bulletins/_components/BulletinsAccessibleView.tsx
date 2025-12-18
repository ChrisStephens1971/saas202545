'use client';

/**
 * BulletinsAccessibleView - Elder-Friendly Linear Layout
 *
 * The "accessible" variant of the bulletins list designed for older adults with:
 * - Single column, linear layout (easier to scan)
 * - Larger buttons and text
 * - Large touch-friendly filter buttons instead of dropdown
 * - Clear visual hierarchy with status emphasized
 * - "This Sunday" focus at top
 *
 * Key differences from Modern:
 * - Single column flow instead of grid
 * - Button-based filter instead of dropdown
 * - Larger, more readable date formatting
 * - More prominent status indicators
 * - Dedicated "This Sunday" section when applicable
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FileText, Plus } from 'lucide-react';
import type { BulletinsViewProps, BulletinFilter, BulletinListItem } from './types';

export function BulletinsAccessibleView({ viewModel, actions }: BulletinsViewProps) {
  const { bulletins, filter, isLoading, error } = viewModel;
  const { onFilterChange } = actions;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded w-2/3" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="py-6">
            <p className="text-xl text-red-800 font-bold">Error loading bulletins</p>
            <p className="text-lg text-red-700 mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find "This Sunday" bulletin (next Sunday or today if Sunday)
  const today = new Date();
  const thisSundayBulletin = findThisSundayBulletin(bulletins, today);
  const otherBulletins = thisSundayBulletin
    ? bulletins.filter((b) => b.id !== thisSundayBulletin.id)
    : bulletins;

  const filterOptions: { value: BulletinFilter; label: string }[] = [
    { value: 'active', label: 'Published' },
    { value: 'drafts', label: 'Drafts' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 text-gray-900 flex items-center justify-center gap-3">
          <FileText className="h-10 w-10 text-primary-600" />
          Bulletins
        </h1>
        <p className="text-xl text-gray-600">Weekly worship bulletins</p>
      </div>

      {/* Create New Button - prominent at top */}
      <div className="mb-8">
        <Link href="/bulletins/new" className="block">
          <Button size="lg" className="w-full text-xl py-6">
            <Plus className="h-6 w-6 mr-2" />
            Create New Bulletin
          </Button>
        </Link>
      </div>

      {/* Filter Buttons - large, touch-friendly */}
      <div className="mb-8">
        <p className="text-lg font-medium text-gray-700 mb-3">Show:</p>
        <div className="flex flex-wrap gap-3">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-6 py-3 rounded-xl text-lg font-medium min-h-touch transition-colors ${
                filter === option.value
                  ? 'bg-primary-600 text-white border-2 border-primary-600'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* This Sunday Section - when applicable */}
      {thisSundayBulletin && filter !== 'deleted' && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">This Sunday</h2>
          <Link href={`/bulletins/${thisSundayBulletin.id}`} className="block">
            <Card className="border-2 border-primary-300 bg-primary-50 hover:shadow-lg transition-shadow">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">📄</div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {new Date(thisSundayBulletin.serviceDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <BulletinStatusBadge status={thisSundayBulletin.status} size="large" />
                  </div>
                </div>
                <Button size="lg" className="w-full mt-4">
                  View Bulletin
                </Button>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}

      {/* Bulletins List */}
      {bulletins.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="py-10 text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-xl text-gray-700 mb-6">
              {filter === 'active' && 'No published bulletins yet.'}
              {filter === 'drafts' && 'No draft bulletins found.'}
              {filter === 'deleted' && 'No deleted bulletins.'}
              {filter === 'all' && 'No bulletins yet.'}
            </p>
            {(filter === 'active' || filter === 'all') && (
              <Link href="/bulletins/new">
                <Button size="lg">Create Your First Bulletin</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <section>
          {otherBulletins.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {thisSundayBulletin ? 'Other Bulletins' : 'All Bulletins'}
              </h2>
              <div className="space-y-4">
                {otherBulletins.map((bulletin) => (
                  <Link href={`/bulletins/${bulletin.id}`} key={bulletin.id} className="block">
                    <Card className="border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                      <CardContent className="py-5">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">📄</div>
                          <div className="flex-1">
                            <p className="text-xl font-bold text-gray-900">
                              {new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <BulletinStatusBadge
                                status={bulletin.deletedAt ? 'deleted' : bulletin.status}
                                size="normal"
                              />
                              <span className="text-base text-gray-500">
                                Created {new Date(bulletin.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Find the bulletin for this Sunday (or next Sunday if today isn't Sunday)
 */
function findThisSundayBulletin(
  bulletins: BulletinListItem[],
  today: Date
): BulletinListItem | null {
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() + daysUntilSunday);
  thisSunday.setHours(0, 0, 0, 0);

  return (
    bulletins.find((b) => {
      const serviceDate = new Date(b.serviceDate);
      serviceDate.setHours(0, 0, 0, 0);
      return serviceDate.getTime() === thisSunday.getTime() && b.status !== 'deleted' && !b.deletedAt;
    }) || null
  );
}

/**
 * Status badge component for bulletins
 */
function BulletinStatusBadge({
  status,
  size,
}: {
  status: string;
  size: 'normal' | 'large';
}) {
  const baseClasses = size === 'large' ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-base';

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    locked: { bg: 'bg-green-100', text: 'text-green-800', label: 'Locked' },
    built: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Built' },
    approved: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Approved' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
    deleted: { bg: 'bg-red-100', text: 'text-red-800', label: 'Deleted' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`${baseClasses} ${config.bg} ${config.text} rounded-full font-medium`}>
      {config.label}
    </span>
  );
}

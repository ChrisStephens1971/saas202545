'use client';

/**
 * BulletinsModernView - Compact Grid Layout
 *
 * The "modern" variant of the bulletins list with:
 * - Multi-column grid layout (3 columns on desktop)
 * - Compact cards with status chips
 * - Higher information density
 * - Dropdown filter
 *
 * Preserves the original bulletins page layout (before dual-UI).
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { BulletinsViewProps, BulletinFilter } from './types';

export function BulletinsModernView({ viewModel, actions }: BulletinsViewProps) {
  const { bulletins, filter, isLoading, error } = viewModel;
  const { onFilterChange } = actions;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-12 bg-gray-200 rounded w-40" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading bulletins: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Bulletins</h1>
        <Link href="/bulletins/new">
          <Button size="lg">Create New Bulletin</Button>
        </Link>
      </div>

      {/* Filter Dropdown */}
      <div className="mb-6 max-w-xs">
        <label htmlFor="bulletin-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter Bulletins
        </label>
        <select
          id="bulletin-filter"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as BulletinFilter)}
        >
          <option value="active">Active (Published)</option>
          <option value="drafts">Drafts</option>
          <option value="deleted">Deleted</option>
          <option value="all">All</option>
        </select>
      </div>

      {bulletins.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {filter === 'active' && 'No published bulletins yet. Create your first bulletin to get started.'}
              {filter === 'drafts' && 'No draft bulletins found.'}
              {filter === 'deleted' && 'No deleted bulletins found.'}
              {filter === 'all' && 'No bulletins yet. Create your first bulletin to get started.'}
            </p>
            {(filter === 'active' || filter === 'all') && (
              <Link href="/bulletins/new">
                <Button size="lg">Create Your First Bulletin</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bulletins.map((bulletin) => (
            <Link href={`/bulletins/${bulletin.id}`} key={bulletin.id}>
              <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>
                    {new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {bulletin.status === 'deleted' || bulletin.deletedAt ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Deleted
                      </span>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          bulletin.status === 'locked'
                            ? 'bg-green-100 text-green-800'
                            : bulletin.status === 'built'
                            ? 'bg-blue-100 text-blue-800'
                            : bulletin.status === 'approved'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {bulletin.status.charAt(0).toUpperCase() + bulletin.status.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Created {new Date(bulletin.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

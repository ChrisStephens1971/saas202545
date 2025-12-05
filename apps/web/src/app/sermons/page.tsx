'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export default function SermonsPage() {
  const [filters, setFilters] = useState({
    search: '',
    preacher: '',
    seriesId: undefined as string | undefined,
    startDate: '',
    endDate: '',
  });

  const { data, isLoading, error } = trpc.sermons.list.useQuery({
    search: filters.search || undefined,
    preacher: filters.preacher || undefined,
    seriesId: filters.seriesId,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    limit: 50,
    offset: 0,
  });

  const { data: seriesData } = trpc.sermons.listSeries.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: stats } = trpc.sermons.stats.useQuery({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading sermons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading sermons: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sermons = data?.sermons || [];
  const seriesList = seriesData?.series || [];

  const clearFilters = () => {
    setFilters({
      search: '',
      preacher: '',
      seriesId: undefined,
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sermon Archive</h1>
          <p className="text-lg text-gray-600">{data?.total || 0} total sermons</p>
        </div>
        <Link href="/sermons/new">
          <Button size="lg">Add Sermon</Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-primary-600">{stats.total_sermons}</p>
              <p className="text-sm text-gray-600 mt-2">Sermons This Year</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-green-600">{stats.unique_preachers}</p>
              <p className="text-sm text-gray-600 mt-2">Preachers</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-blue-600">{stats.series_count}</p>
              <p className="text-sm text-gray-600 mt-2">Active Series</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="outlined" className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filter Sermons</CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Search (Title or Scripture)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            {/* Preacher */}
            <div>
              <label className="block text-sm font-medium mb-2">Preacher</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Preacher name..."
                value={filters.preacher}
                onChange={(e) => setFilters({ ...filters, preacher: e.target.value })}
              />
            </div>

            {/* Series */}
            <div>
              <label className="block text-sm font-medium mb-2">Sermon Series</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={filters.seriesId || ''}
                onChange={(e) =>
                  setFilters({ ...filters, seriesId: e.target.value || undefined })
                }
              >
                <option value="">All Series</option>
                {seriesList.map((series: any) => (
                  <option key={series.id} value={series.id}>
                    {series.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sermons List */}
      {sermons.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {filters.search || filters.preacher || filters.seriesId || filters.startDate
                ? 'No sermons match your filters.'
                : 'No sermons yet. Add your first sermon to get started.'}
            </p>
            <Link href="/sermons/new">
              <Button size="lg">Add First Sermon</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sermons.map((sermon: any) => (
            <Link href={`/sermons/${sermon.id}`} key={sermon.id}>
              <Card
                variant="elevated"
                className="hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{sermon.title}</h3>
                        {sermon.series_title && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {sermon.series_title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-base text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          📅 {new Date(sermon.sermon_date).toLocaleDateString()}
                        </span>
                        {sermon.preacher && (
                          <span className="flex items-center gap-1">
                            👤 {sermon.preacher}
                          </span>
                        )}
                        {sermon.primary_scripture && (
                          <span className="flex items-center gap-1">
                            📖 {sermon.primary_scripture}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {sermon.manuscript && (
                          <span className="flex items-center gap-1">
                            📝 Manuscript
                          </span>
                        )}
                        {sermon.audio_url && (
                          <span className="flex items-center gap-1">
                            🎵 Audio
                          </span>
                        )}
                        {sermon.video_url && (
                          <span className="flex items-center gap-1">
                            🎥 Video
                          </span>
                        )}
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

      {data && data.total > data.sermons.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - data.sermons.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

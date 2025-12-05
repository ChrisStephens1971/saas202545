'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SongForm } from '@/components/songs/SongForm';

export default function SongsPage() {
  const [filters, setFilters] = useState({
    query: '',
    hymnalCode: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [page, setPage] = useState(0);
  const limit = 50;

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.songs.list.useQuery({
    query: filters.query || undefined,
    hymnalCode: filters.hymnalCode || undefined,
    limit,
    offset: page * limit,
  });

  const createSong = trpc.songs.create.useMutation({
    onSuccess: () => {
      utils.songs.list.invalidate();
      setShowForm(false);
    },
  });

  const updateSong = trpc.songs.update.useMutation({
    onSuccess: () => {
      utils.songs.list.invalidate();
      setShowForm(false);
      setEditingSong(null);
    },
  });

  const deleteSong = trpc.songs.delete.useMutation({
    onSuccess: () => {
      utils.songs.list.invalidate();
    },
  });

  const handleSubmit = async (formData: any) => {
    if (editingSong) {
      await updateSong.mutateAsync({ id: editingSong.id, ...formData });
    } else {
      await createSong.mutateAsync(formData);
    }
  };

  const handleEdit = (song: any) => {
    setEditingSong(song);
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete song "${title}"? This will unlink it from any service items.`)) {
      try {
        await deleteSong.mutateAsync({ id });
      } catch (error: any) {
        alert(`Failed to delete: ${error.message}`);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSong(null);
  };

  const clearFilters = () => {
    setFilters({ query: '', hymnalCode: '' });
    setPage(0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading songs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading songs: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const songs = data?.songs || [];
  const total = data?.total || 0;

  // Common hymnal codes for the filter dropdown
  const hymnalCodes = [
    { code: 'UMH', name: 'United Methodist Hymnal' },
    { code: 'CH', name: 'Chalice Hymnal' },
    { code: 'PH', name: 'Presbyterian Hymnal' },
    { code: 'ELW', name: 'Evangelical Lutheran Worship' },
    { code: 'TFWS', name: 'The Faith We Sing' },
    { code: 'W&S', name: 'Worship & Song' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Song Library</h1>
          <p className="text-lg text-gray-600">{total} songs</p>
        </div>
        <Button size="lg" onClick={() => setShowForm(true)}>
          Add Song
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="mb-8">
          <SongForm
            initialData={editingSong}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createSong.isPending || updateSong.isPending}
          />
        </div>
      )}

      {/* Filters */}
      {!showForm && (
        <Card variant="outlined" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Search Songs</CardTitle>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search (Title, Hymn #, CCLI)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Search..."
                  value={filters.query}
                  onChange={(e) => {
                    setFilters({ ...filters, query: e.target.value });
                    setPage(0);
                  }}
                />
              </div>

              {/* Hymnal Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Hymnal</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={filters.hymnalCode}
                  onChange={(e) => {
                    setFilters({ ...filters, hymnalCode: e.target.value });
                    setPage(0);
                  }}
                >
                  <option value="">All Hymnals</option>
                  {hymnalCodes.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} - {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Songs List */}
      {!showForm && (
        <>
          {songs.length === 0 ? (
            <Card variant="outlined">
              <CardContent className="text-center py-12">
                <p className="text-xl text-gray-600 mb-6">
                  {filters.query || filters.hymnalCode
                    ? 'No songs match your search.'
                    : 'No songs yet. Add your first song to get started.'}
                </p>
                <Button size="lg" onClick={() => setShowForm(true)}>
                  Add First Song
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold">Title</th>
                    <th className="text-left px-4 py-3 font-semibold">Hymn #</th>
                    <th className="text-left px-4 py-3 font-semibold">Hymnal</th>
                    <th className="text-left px-4 py-3 font-semibold">CCLI #</th>
                    <th className="text-left px-4 py-3 font-semibold">Author</th>
                    <th className="text-center px-4 py-3 font-semibold">PD</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song: any) => (
                    <tr
                      key={song.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{song.title}</span>
                          {song.alternateTitle && (
                            <span className="text-gray-500 text-sm ml-2">
                              ({song.alternateTitle})
                            </span>
                          )}
                        </div>
                        {song.tuneName && (
                          <div className="text-sm text-gray-500">
                            Tune: {song.tuneName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{song.hymnNumber || '—'}</td>
                      <td className="px-4 py-3">
                        {song.hymnalCode ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {song.hymnalCode}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">{song.ccliNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{song.author || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {song.isPublicDomain ? (
                          <span className="text-green-600" title="Public Domain">
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(song)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(song.id, song.title)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="mt-6 flex justify-center gap-4">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-gray-600">
                Page {page + 1} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

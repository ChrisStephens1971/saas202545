'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Search, Plus, Loader2, Music, AlertCircle } from 'lucide-react';
import type { SermonElement } from '@elder-first/types';

interface SermonHelperHymnFinderProps {
  onAddToOutline: (element: SermonElement) => void;
}

/**
 * Generate a simple UUID for client-side element IDs
 */
function generateId(): string {
  return crypto.randomUUID();
}

interface HymnResult {
  id: string;
  title: string;
  alternateTitle: string | null;
  hymnNumber: string | null;
  hymnalCode: string | null;
  tuneName: string | null;
  author: string | null;
  isPublicDomain: boolean;
  ccliNumber: string | null;
}

export function SermonHelperHymnFinder({ onAddToOutline }: SermonHelperHymnFinderProps) {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: hymns,
    isLoading,
    error,
  } = trpc.sermonHelper.searchHymns.useQuery(
    { query: searchQuery, limit: 20 },
    {
      enabled: searchQuery.length > 0,
    }
  );

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Add hymn to outline
  const addHymn = (hymn: HymnResult) => {
    onAddToOutline({
      id: generateId(),
      type: 'hymn',
      hymnId: hymn.id,
      title: hymn.title,
      note: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Music size={20} className="text-green-600" />
            Hymn Finder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search hymns by title, tune, or lyrics..."
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={!query.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Search your church&apos;s hymn library by title, tune name, or lyric text.
          </p>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {error.message || 'Failed to search hymns. Please try again.'}
        </div>
      )}

      {/* Results */}
      {searchQuery && !isLoading && hymns && (
        <Card variant="outlined">
          <CardHeader>
            <CardTitle className="text-base">
              {hymns.length > 0
                ? `Found ${hymns.length} hymn${hymns.length === 1 ? '' : 's'}`
                : 'No hymns found'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hymns.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Music size={32} className="mx-auto mb-2 opacity-50" />
                <p>No hymns match your search.</p>
                <p className="text-sm mt-1">Try a different title or keyword.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hymns.map((hymn) => (
                  <div
                    key={hymn.id}
                    className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {hymn.title}
                        {hymn.alternateTitle && (
                          <span className="text-gray-500 font-normal">
                            {' '}
                            ({hymn.alternateTitle})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                        {hymn.hymnNumber && hymn.hymnalCode && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {hymn.hymnalCode} #{hymn.hymnNumber}
                          </span>
                        )}
                        {hymn.tuneName && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {hymn.tuneName}
                          </span>
                        )}
                        {hymn.author && (
                          <span className="text-gray-600">by {hymn.author}</span>
                        )}
                        {hymn.isPublicDomain && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            Public Domain
                          </span>
                        )}
                        {hymn.ccliNumber && (
                          <span className="text-gray-400">CCLI: {hymn.ccliNumber}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addHymn(hymn)}
                      className="flex-shrink-0 gap-1"
                    >
                      <Plus size={14} /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!searchQuery && (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
          <Music size={32} className="mx-auto mb-2 opacity-50" />
          <p>Enter a search term to find hymns.</p>
          <p className="text-sm mt-1">
            You can search by title, tune name, or lyrics.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function GroupsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = trpc.groups.list.useQuery({
    category: categoryFilter,
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading groups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading groups: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groups = data?.groups || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Groups</h1>
        <Link href="/groups/new">
          <Button size="lg">Create Group</Button>
        </Link>
      </div>

      {/* Category Filter */}
      <div className="mb-6 max-w-2xl">
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={categoryFilter || ''}
          onChange={(e) => setCategoryFilter(e.target.value || undefined)}
        >
          <option value="">All Categories</option>
          <option value="small-group">Small Group</option>
          <option value="ministry">Ministry</option>
          <option value="service">Service</option>
          <option value="study">Study</option>
          <option value="fellowship">Fellowship</option>
          <option value="other">Other</option>
        </select>
      </div>

      {groups.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {categoryFilter
                ? `No groups found in category "${categoryFilter}"`
                : 'No groups yet. Create your first group to get started.'}
            </p>
            <Link href="/groups/new">
              <Button size="lg">Create First Group</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group: any) => (
            <Link href={`/groups/${group.id}`} key={group.id}>
              <Card
                variant="elevated"
                className="hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{group.name}</h3>
                        {group.category && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {group.category}
                          </span>
                        )}
                        {!group.is_public && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-base text-gray-600 mb-2">
                        {group.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {group.leader_first_name && (
                          <span>
                            Leader: {group.leader_first_name} {group.leader_last_name}
                          </span>
                        )}
                        <span>{group.member_count || 0} members</span>
                        {group.max_members && (
                          <span>Max: {group.max_members}</span>
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

      {data && data.total > data.groups.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - data.groups.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

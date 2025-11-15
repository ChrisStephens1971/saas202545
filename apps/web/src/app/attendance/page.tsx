'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function AttendancePage() {
  const [categoryFilter, setCategoryFilter] = useState<
    'SundayService' | 'SmallGroup' | 'Event' | 'Class' | 'Meeting' | 'Other' | undefined
  >(undefined);

  const { data, isLoading, error } = trpc.attendance.listSessions.useQuery({
    category: categoryFilter,
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading attendance sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading sessions: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessions = data?.sessions || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Attendance</h1>
        <Link href="/attendance/new">
          <Button size="lg">Create Session</Button>
        </Link>
      </div>

      {/* Category Filter */}
      <div className="mb-6 max-w-2xl">
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={categoryFilter || ''}
          onChange={(e) => setCategoryFilter(e.target.value as any || undefined)}
        >
          <option value="">All Categories</option>
          <option value="SundayService">Sunday Service</option>
          <option value="SmallGroup">Small Group</option>
          <option value="Event">Event</option>
          <option value="Class">Class</option>
          <option value="Meeting">Meeting</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {sessions.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {categoryFilter
                ? `No ${categoryFilter} sessions found`
                : 'No attendance sessions yet. Create your first session to get started.'}
            </p>
            <Link href="/attendance/new">
              <Button size="lg">Create First Session</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session: any) => (
            <Link href={`/attendance/${session.id}`} key={session.id}>
              <Card
                variant="elevated"
                className="hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{session.name}</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {session.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-base text-gray-600">
                        <span>
                          {new Date(session.session_date).toLocaleDateString()}
                          {session.session_time && ` at ${session.session_time}`}
                        </span>
                        {session.event_title && (
                          <span className="text-sm">Event: {session.event_title}</span>
                        )}
                        {session.group_name && (
                          <span className="text-sm">Group: {session.group_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500 mt-2">
                        <span className="font-medium">
                          Total: {session.total_count || 0}
                        </span>
                        <span>Members: {session.member_count || 0}</span>
                        <span>Visitors: {session.visitor_count || 0}</span>
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

      {data && data.total > data.sessions.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - data.sessions.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function FormsPage() {
  const [statusFilter, setStatusFilter] = useState<'draft' | 'active' | 'closed' | 'archived' | undefined>(undefined);

  const { data, isLoading, error } = trpc.forms.list.useQuery({
    status: statusFilter,
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading forms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading forms: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const forms = data?.forms || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Forms</h1>
        <Link href="/forms/new">
          <Button size="lg">Create Form</Button>
        </Link>
      </div>

      {/* Status Filter */}
      <div className="mb-6 max-w-2xl">
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value as any || undefined)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {forms.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {statusFilter
                ? `No ${statusFilter} forms found`
                : 'No forms yet. Create your first form to get started.'}
            </p>
            <Link href="/forms/new">
              <Button size="lg">Create First Form</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form: any) => (
            <Link href={`/forms/${form.id}`} key={form.id}>
              <Card
                variant="elevated"
                className="hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{form.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            form.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : form.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : form.status === 'closed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-base text-gray-600 mb-2">{form.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{form.submission_count || 0} submissions</span>
                        {form.require_login && <span>Login required</span>}
                        {form.allow_multiple_submissions && <span>Multiple submissions allowed</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" size="sm">
                        View Form
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.total > data.forms.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - data.forms.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function DirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = trpc.directory.listMembers.useQuery({
    search: searchTerm || undefined,
    limit: 50,
    offset: 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading member directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading directory: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const members = data?.members || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Member Directory</h1>
        <Button variant="secondary" size="lg">
          Privacy Settings
        </Button>
      </div>

      {/* Info Banner */}
      <Card variant="outlined" className="mb-6">
        <CardContent className="py-4">
          <p className="text-base text-gray-700">
            This directory respects member privacy settings. Only information that members have chosen to share is displayed.
            To update your privacy preferences, click &quot;Privacy Settings&quot; above.
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 max-w-2xl">
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" size="lg">
            Search
          </Button>
        </div>
      </form>

      {/* Results Count */}
      <p className="text-base text-gray-600 mb-4">
        {data?.total || 0} member{data?.total !== 1 ? 's' : ''} found
      </p>

      {members.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600">
              {searchTerm
                ? 'No members found matching your search.'
                : 'No members in directory yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member: any) => (
            <Card
              key={member.id}
              variant="elevated"
              className="hover:shadow-xl transition-shadow"
            >
              <CardContent className="py-4">
                {/* Photo */}
                {member.photo_url && (
                  <div className="mb-4 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic member photo from external URL; dimensions unknown */}
                    <img
                      src={member.photo_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  </div>
                )}

                {/* Name */}
                <h3 className="text-xl font-semibold text-center mb-2">
                  {member.first_name} {member.last_name}
                </h3>

                {/* Membership Status */}
                <div className="text-center mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      member.membership_status === 'member'
                        ? 'bg-green-100 text-green-800'
                        : member.membership_status === 'attendee'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {member.membership_status?.charAt(0).toUpperCase() +
                      member.membership_status?.slice(1) || 'Visitor'}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-base">
                  {member.email && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <a
                        href={`mailto:${member.email}`}
                        className="text-primary-600 hover:underline break-all"
                      >
                        {member.email}
                      </a>
                    </div>
                  )}

                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <a
                        href={`tel:${member.phone}`}
                        className="text-primary-600 hover:underline"
                      >
                        {member.phone}
                      </a>
                    </div>
                  )}

                  {member.address && (
                    <div className="flex items-start gap-2 text-gray-700">
                      <svg
                        className="w-5 h-5 text-gray-400 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div className="text-sm">
                        <p>{member.address}</p>
                        {member.city && member.state && (
                          <p>
                            {member.city}, {member.state} {member.zip_code || ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {member.birthday && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm">
                        {new Date(member.birthday).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* No Contact Info Message */}
                {!member.email && !member.phone && !member.address && !member.birthday && (
                  <p className="text-sm text-gray-500 text-center italic mt-2">
                    Contact information not shared
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.total > members.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - members.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

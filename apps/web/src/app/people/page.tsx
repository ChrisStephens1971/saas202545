'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // TODO: Replace with real role check when Azure AD B2C is implemented
  // For now, hardcoded to admin view. In production, check user.role
  const isAdmin = true; // localStorage.getItem('user-role') === 'admin'
  const [showAdminView, setShowAdminView] = useState(isAdmin);

  // Admin view: All people with full details
  const { data: adminData, isLoading: adminLoading, error: adminError } = trpc.people.list.useQuery({
    search: debouncedSearch,
    limit: 50,
    offset: 0,
  }, { enabled: showAdminView });

  // Member view: Privacy-filtered directory
  const { data: directoryData, isLoading: directoryLoading, error: directoryError } = trpc.directory.listMembers.useQuery({
    search: debouncedSearch,
    limit: 50,
    offset: 0,
  }, { enabled: !showAdminView });

  const isLoading = showAdminView ? adminLoading : directoryLoading;
  const error = showAdminView ? adminError : directoryError;
  const data = showAdminView ? adminData : directoryData;
  const people = showAdminView ? (adminData?.people || []) : (directoryData?.members || []);

  const handleSearch = (value: string) => {
    setSearch(value);
    // Debounce search
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timeout);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading people...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading people: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {showAdminView ? 'People Management' : 'Member Directory'}
          </h1>
          {!showAdminView && (
            <p className="text-base text-gray-600 mt-2">
              Privacy-filtered directory - only shared information is shown
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Admin View Toggle - TODO: Only show if user is admin */}
          {isAdmin && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAdminView(!showAdminView)}
            >
              {showAdminView ? 'Switch to Directory' : 'Switch to Admin'}
            </Button>
          )}
          {showAdminView && (
            <Link href="/people/new">
              <Button size="lg">Add Person</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-2xl">
        <Input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {people.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              {debouncedSearch
                ? `No results found for "${debouncedSearch}"`
                : showAdminView
                ? 'No people yet. Add your first church member to get started.'
                : 'No members in directory yet.'}
            </p>
            {showAdminView && (
              <Link href="/people/new">
                <Button size="lg">Add First Person</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {people.map((person: any) => {
            // Handle different field names between admin (camelCase) and directory (snake_case) APIs
            const firstName = showAdminView ? person.firstName : person.first_name;
            const lastName = showAdminView ? person.lastName : person.last_name;
            const membershipStatus = showAdminView ? person.membershipStatus : person.membership_status;

            return (
              <Link href={showAdminView ? `/people/${person.id}` : '#'} key={person.id}>
                <Card
                  variant="elevated"
                  className={showAdminView ? "hover:shadow-xl transition-shadow cursor-pointer" : ""}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary-600">
                            {firstName?.[0] || ''}
                            {lastName?.[0] || ''}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">
                            {firstName} {lastName}
                          </h3>
                          <p className="text-base text-gray-600">
                            {person.email || 'No email'}
                          </p>
                          {person.phone && (
                            <p className="text-sm text-gray-500">{person.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            membershipStatus === 'member'
                              ? 'bg-green-100 text-green-800'
                              : membershipStatus === 'attendee'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {membershipStatus?.charAt(0).toUpperCase() +
                            membershipStatus?.slice(1) || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {data && data.total > people.length && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="lg">
            Load More ({data.total - people.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

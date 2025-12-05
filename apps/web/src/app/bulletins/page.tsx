'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export default function BulletinsPage() {
  const { data, isLoading, error } = trpc.bulletins.list.useQuery({
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading bulletins...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading bulletins: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bulletins = data?.bulletins || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Bulletins</h1>
        <Link href="/bulletins/new">
          <Button size="lg">Create New Bulletin</Button>
        </Link>
      </div>

      {bulletins.length === 0 ? (
        <Card variant="outlined">
          <CardContent className="text-center py-12">
            <p className="text-xl text-gray-600 mb-6">
              No bulletins yet. Create your first bulletin to get started.
            </p>
            <Link href="/bulletins/new">
              <Button size="lg">Create Your First Bulletin</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bulletins.map((bulletin: any) => (
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
                  <div className="flex items-center gap-2">
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

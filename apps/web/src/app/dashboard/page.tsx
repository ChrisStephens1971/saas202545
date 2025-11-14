'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: bulletins } = trpc.bulletins.list.useQuery({ limit: 5 });
  const { data: people } = trpc.people.list.useQuery({ limit: 5 });
  const { data: events } = trpc.events.list.useQuery({ limit: 5 });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-lg text-gray-600">
          Welcome to Elder-First Church Platform
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/bulletins/new">
          <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-xl font-bold">Create Bulletin</h3>
            </CardContent>
          </Card>
        </Link>

        <Link href="/people/new">
          <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-3">👤</div>
              <h3 className="text-xl font-bold">Add Person</h3>
            </CardContent>
          </Card>
        </Link>

        <Link href="/events/new">
          <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-3">📅</div>
              <h3 className="text-xl font-bold">Create Event</h3>
            </CardContent>
          </Card>
        </Link>

        <Link href="/announcements/new">
          <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-3">📢</div>
              <h3 className="text-xl font-bold">New Announcement</h3>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Recent Bulletins</CardTitle>
            <CardDescription>
              {bulletins?.total || 0} total bulletins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/bulletins">
              <Button variant="outline" className="w-full">
                View All Bulletins
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Church Members</CardTitle>
            <CardDescription>
              {people?.total || 0} total people
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/people">
              <Button variant="outline" className="w-full">
                View All People
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              {events?.total || 0} total events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/events">
              <Button variant="outline" className="w-full">
                View All Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Complete these steps to set up your church platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
              <div className="text-2xl">✅</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">Foundation Complete</h4>
                <p className="text-base text-gray-600">
                  Your platform is set up and ready to use
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl">📋</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">Add Church Members</h4>
                <p className="text-base text-gray-600 mb-2">
                  Import or add your church members to the system
                </p>
                <Link href="/people/new">
                  <Button size="sm">Add First Person</Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl">📄</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">Create Your First Bulletin</h4>
                <p className="text-base text-gray-600 mb-2">
                  Start building this Sunday&apos;s bulletin
                </p>
                <Link href="/bulletins/new">
                  <Button size="sm">Create Bulletin</Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl">⚙️</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">Configure Settings</h4>
                <p className="text-base text-gray-600 mb-2">
                  Set up your church details and branding
                </p>
                <Link href="/settings">
                  <Button size="sm" variant="outline">
                    Go to Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

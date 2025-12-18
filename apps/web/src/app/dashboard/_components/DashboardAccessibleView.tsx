'use client';

/**
 * DashboardAccessibleView - Elder-Friendly Dashboard Layout
 *
 * The "accessible" variant of the dashboard designed for older adults with:
 * - Single column, linear layout (easier to scan)
 * - Larger buttons and text
 * - Fewer competing CTAs on screen
 * - Clear section headings with visual hierarchy
 * - Priority information first (announcements, this Sunday)
 *
 * Key differences from Modern:
 * - Simpler one-column flow instead of grid
 * - Larger touch targets on all interactive elements
 * - Reduced visual noise
 * - "This Sunday" focus rather than multi-week overview
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Calendar, Megaphone } from 'lucide-react';
import type { DashboardViewProps } from './types';

export function DashboardAccessibleView({ viewModel }: DashboardViewProps) {
  const { bulletins, events, people, announcements, isLoading } = viewModel;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded w-2/3" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get next Sunday's bulletin if one exists
  const nextBulletin = bulletins[0];
  const nextEvent = events[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Welcome Header - large and friendly */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 text-gray-900">Welcome</h1>
        <p className="text-xl text-gray-600">
          Elder-First Church Platform
        </p>
      </div>

      {/* Priority: Urgent Announcements */}
      {announcements.filter(a => a.priority === 'Urgent').length > 0 && (
        <section className="mb-10">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-red-800 mb-4 flex items-center gap-3">
              <Megaphone className="h-7 w-7" />
              Important Notice
            </h2>
            {announcements
              .filter(a => a.priority === 'Urgent')
              .slice(0, 1)
              .map((announcement) => (
                <div key={announcement.id}>
                  <h3 className="text-xl font-bold text-red-900 mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-lg text-red-800 mb-4">
                    {announcement.body}
                  </p>
                  <Link href={`/announcements/${announcement.id}`}>
                    <Button size="lg" className="w-full">
                      Read More
                    </Button>
                  </Link>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* This Sunday Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Calendar className="h-7 w-7 text-primary-600" />
          This Sunday
        </h2>

        {nextBulletin ? (
          <Card className="border-2 border-primary-200 bg-primary-50">
            <CardContent className="py-6">
              <p className="text-xl font-bold text-gray-900 mb-2">
                Sunday Bulletin Ready
              </p>
              <p className="text-lg text-gray-700 mb-4">
                {new Date(nextBulletin.serviceDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <div className="space-y-3">
                <Link href={`/bulletins/${nextBulletin.id}`} className="block">
                  <Button size="lg" className="w-full">
                    View Bulletin
                  </Button>
                </Link>
                <Link href="/bulletins" className="block">
                  <Button size="lg" variant="outline" className="w-full">
                    All Bulletins
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-gray-200">
            <CardContent className="py-6 text-center">
              <p className="text-lg text-gray-600 mb-4">
                No bulletin created yet for this Sunday.
              </p>
              <Link href="/bulletins/new" className="block">
                <Button size="lg" className="w-full">
                  Create Sunday Bulletin
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quick Actions - stacked vertically for easy tapping */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="space-y-4">
          <Link href="/bulletins/new" className="block">
            <Card className="border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="text-4xl">📄</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Create Bulletin</h3>
                  <p className="text-base text-gray-600">Start a new weekly bulletin</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/people" className="block">
            <Card className="border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="text-4xl">👥</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">People Directory</h3>
                  <p className="text-base text-gray-600">{people.length > 0 ? `${people.length} members` : 'View church members'}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/events" className="block">
            <Card className="border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="text-4xl">📅</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Events Calendar</h3>
                  <p className="text-base text-gray-600">
                    {nextEvent
                      ? `Next: ${nextEvent.title}`
                      : 'View upcoming events'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Announcements Section (non-urgent) */}
      {announcements.filter(a => a.priority !== 'Urgent').length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Megaphone className="h-7 w-7 text-gray-600" />
            Announcements
          </h2>
          <div className="space-y-4">
            {announcements
              .filter(a => a.priority !== 'Urgent')
              .slice(0, 3)
              .map((announcement) => (
                <Card
                  key={announcement.id}
                  className={`border-2 ${
                    announcement.priority === 'High'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <CardContent className="py-5">
                    <div className="flex items-start gap-3 mb-3">
                      {announcement.priority === 'High' && (
                        <span className="text-orange-500">●</span>
                      )}
                      <h3 className="text-xl font-bold text-gray-900">
                        {announcement.title}
                      </h3>
                    </div>
                    <p className="text-lg text-gray-700 mb-4">
                      {announcement.body.length > 200
                        ? `${announcement.body.substring(0, 200)}...`
                        : announcement.body}
                    </p>
                    <Link href={`/announcements/${announcement.id}`}>
                      <Button variant="outline" size="lg" className="w-full">
                        Read More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      )}

      {/* Settings Link */}
      <section className="pt-6 border-t-2 border-gray-200">
        <Link href="/settings" className="block">
          <Card className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="py-5 flex items-center gap-4">
              <div className="text-4xl">⚙️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Settings</h3>
                <p className="text-base text-gray-600">Configure your preferences</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}

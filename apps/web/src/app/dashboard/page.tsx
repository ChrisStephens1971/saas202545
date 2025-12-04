'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Link from 'next/link';

export default function DashboardPage() {
  // Get upcoming events (next 30 days)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const { data: bulletins } = trpc.bulletins.list.useQuery({ limit: 5 });
  const { data: people } = trpc.people.list.useQuery({ limit: 5 });
  const { data: events } = trpc.events.list.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 5
  });
  const { data: announcements } = trpc.announcements.listActive.useQuery();

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

      {/* Active Announcements */}
      {announcements && announcements.announcements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📢 Active Announcements</h2>
          <div className="space-y-3">
            {announcements.announcements.slice(0, 3).map((announcement) => {
              const getPriorityColor = (priority: string) => {
                switch (priority) {
                  case 'Urgent':
                    return 'border-l-4 border-red-500 bg-red-50';
                  case 'High':
                    return 'border-l-4 border-orange-500 bg-orange-50';
                  default:
                    return 'border-l-4 border-blue-500 bg-blue-50';
                }
              };

              return (
                <Card key={announcement.id} className={getPriorityColor(announcement.priority)}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold">{announcement.title}</h3>
                          {announcement.priority === 'Urgent' && <span className="text-red-600">🔴</span>}
                          {announcement.priority === 'High' && <span className="text-orange-600">🟠</span>}
                        </div>
                        <p className="text-base text-gray-700">
                          {announcement.body.length > 150
                            ? `${announcement.body.substring(0, 150)}...`
                            : announcement.body}
                        </p>
                      </div>
                      <Link href={`/announcements/${announcement.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
            {bulletins && bulletins.bulletins.length > 0 ? (
              <div className="space-y-2 mb-4">
                {bulletins.bulletins.slice(0, 3).map((bulletin) => (
                  <Link key={bulletin.id} href={`/bulletins/${bulletin.id}`}>
                    <div className="p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <p className="text-sm font-medium">
                        {new Date(bulletin.serviceDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">{bulletin.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 mb-4">No bulletins yet</p>
            )}
            <Link href="/bulletins">
              <Button variant="outline" className="w-full">
                View All Bulletins
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              {events?.events?.length || 0} in next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events && events.events.length > 0 ? (
              <div className="space-y-2 mb-4">
                {events.events.slice(0, 3).map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(event.startAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {event.allDay ? ' (All day)' : ` at ${new Date(event.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 mb-4">No upcoming events</p>
            )}
            <Link href="/events">
              <Button variant="outline" className="w-full">
                View Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Church Directory</CardTitle>
            <CardDescription>
              {people?.total || 0} total people
            </CardDescription>
          </CardHeader>
          <CardContent>
            {people && people.people.length > 0 ? (
              <div className="space-y-2 mb-4">
                {people.people.slice(0, 3).map((person) => (
                  <Link key={person.id} href={`/people/${person.id}`}>
                    <div className="p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <p className="text-sm font-medium">
                        {person.firstName} {person.lastName}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">{person.membershipStatus}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 mb-4">No people yet</p>
            )}
            <Link href="/people">
              <Button variant="outline" className="w-full">
                View All People
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

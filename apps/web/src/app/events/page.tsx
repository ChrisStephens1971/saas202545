'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export default function EventsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get events for current month
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  const { data: eventsData, isLoading } = trpc.events.list.useQuery({
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
    limit: 100,
  });

  const events = eventsData?.events || [];

  // Calendar helpers
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.startAt);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  // Generate calendar days
  const calendarDays = [];
  // Empty cells before first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="p-2 bg-gray-50" />);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    const isToday = new Date().getDate() === day &&
      new Date().getMonth() === currentDate.getMonth() &&
      new Date().getFullYear() === currentDate.getFullYear();

    calendarDays.push(
      <div
        key={day}
        className={`p-2 min-h-[100px] border border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-white'}`}
      >
        <div className={`text-lg font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayEvents.map(event => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <div className="text-sm bg-primary-100 text-primary-800 px-2 py-1 rounded hover:bg-primary-200 cursor-pointer truncate">
                {event.allDay ? '📅' : '🕐'} {event.title}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Events Calendar</h1>
          <p className="text-lg text-gray-600">
            {eventsData?.total || 0} total events
          </p>
        </div>
        <Link href="/events/new">
          <Button variant="primary" size="lg">
            Create Event
          </Button>
        </Link>
      </div>

      {/* Calendar Navigation */}
      <Card variant="elevated" className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={previousMonth}>
              ← Previous
            </Button>
            <CardTitle>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="outline" onClick={nextMonth}>
              Next →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : (
            <>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-bold text-gray-700 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle>Upcoming Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 mb-6">
                No events scheduled for this month.
              </p>
              <Link href="/events/new">
                <Button size="lg">Create First Event</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map(event => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="flex items-start gap-4 p-4 border-2 rounded-lg hover:border-primary-500 hover:shadow-md transition-all cursor-pointer">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600">
                        {new Date(event.startAt).getDate()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {monthNames[new Date(event.startAt).getMonth()].slice(0, 3)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
                      {event.description && (
                        <p className="text-gray-600 mb-2">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          🕐 {event.allDay ? 'All day' : new Date(event.startAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        {event.locationName && (
                          <span className="flex items-center gap-1">
                            📍 {event.locationName}
                          </span>
                        )}
                        {event.allowRsvp && (
                          <span className="flex items-center gap-1">
                            ✅ RSVP Available
                            {event.rsvpLimit && ` (${event.rsvpLimit} max)`}
                          </span>
                        )}
                        {event.isPublic && (
                          <span className="text-green-600">🌐 Public</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

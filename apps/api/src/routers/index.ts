import { router } from '../trpc';
import { healthRouter } from './health';
import { peopleRouter } from './people';
import { eventsRouter } from './events';
import { announcementsRouter } from './announcements';

export const appRouter = router({
  health: healthRouter,
  people: peopleRouter,
  events: eventsRouter,
  announcements: announcementsRouter,
});

export type AppRouter = typeof appRouter;

import { router } from '../trpc';
import { healthRouter } from './health';
import { peopleRouter } from './people';
import { eventsRouter } from './events';
import { announcementsRouter } from './announcements';
import { bulletinsRouter } from './bulletins';
import { serviceItemsRouter } from './serviceItems';

export const appRouter = router({
  health: healthRouter,
  people: peopleRouter,
  events: eventsRouter,
  announcements: announcementsRouter,
  bulletins: bulletinsRouter,
  serviceItems: serviceItemsRouter,
});

export type AppRouter = typeof appRouter;

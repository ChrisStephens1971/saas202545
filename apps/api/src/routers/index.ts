import { router } from '../trpc';
import { healthRouter } from './health';
import { peopleRouter } from './people';
import { eventsRouter } from './events';
import { announcementsRouter } from './announcements';
import { bulletinsRouter } from './bulletins';
import { serviceItemsRouter } from './serviceItems';
import { groupsRouter } from './groups';
import { formsRouter } from './forms';
import { attendanceRouter } from './attendance';
import { donationsRouter } from './donations';
import { communicationsRouter } from './communications';
import { directoryRouter } from './directory';
import { prayersRouter } from './prayers';

export const appRouter = router({
  health: healthRouter,
  people: peopleRouter,
  events: eventsRouter,
  announcements: announcementsRouter,
  bulletins: bulletinsRouter,
  serviceItems: serviceItemsRouter,
  groups: groupsRouter,
  forms: formsRouter,
  attendance: attendanceRouter,
  donations: donationsRouter,
  communications: communicationsRouter,
  directory: directoryRouter,
  prayers: prayersRouter,
});

export type AppRouter = typeof appRouter;
 

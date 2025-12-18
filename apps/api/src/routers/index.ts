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
import { sermonsRouter } from './sermons';
import { sermonHelperRouter } from './sermonHelper';
import { aiRouter } from './ai';
import { aiSettingsRouter } from './aiSettings';
import { songsRouter } from './songs';
import { analyticsRouter } from './analytics';
import { orgRouter } from './org';
import { tenantsRouter } from './tenants';
import { thankYouNotesRouter } from './thankYouNotes';
import { scriptureRouter } from './scripture';
import { preachRouter } from './preach';
import { adminAiUsageRouter } from './adminAiUsage';
import { adminTenantPlanRouter } from './adminTenantPlan';
import { userPreferencesRouter } from './userPreferences';
import { servicePlansRouter } from './servicePlans';

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
  sermons: sermonsRouter,
  sermonHelper: sermonHelperRouter,
  ai: aiRouter,
  aiSettings: aiSettingsRouter,
  songs: songsRouter,
  analytics: analyticsRouter,
  org: orgRouter,
  tenants: tenantsRouter,
  thankYouNotes: thankYouNotesRouter,
  scripture: scriptureRouter,
  preach: preachRouter,
  adminAiUsage: adminAiUsageRouter,
  adminTenantPlan: adminTenantPlanRouter,
  userPreferences: userPreferencesRouter,
  servicePlans: servicePlansRouter,
});

export type AppRouter = typeof appRouter;
 

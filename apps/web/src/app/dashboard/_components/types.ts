/**
 * Dashboard View Model Types
 *
 * Shared types for the Dashboard container + dual view pattern.
 * Both DashboardModernView and DashboardAccessibleView accept these same props.
 */

/**
 * Bulletin summary for dashboard display
 */
export interface DashboardBulletin {
  id: string;
  serviceDate: string | Date;
  status: string;
}

/**
 * Event summary for dashboard display
 */
export interface DashboardEvent {
  id: string;
  title: string;
  startAt: string | Date;
  allDay: boolean;
}

/**
 * Person summary for dashboard display
 */
export interface DashboardPerson {
  id: string;
  firstName: string;
  lastName: string;
  membershipStatus: string;
}

/**
 * Announcement summary for dashboard display
 */
export interface DashboardAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: 'Normal' | 'High' | 'Urgent';
}

/**
 * View model passed from DashboardContainer to both view variants.
 * All data fetching happens in the container; views are purely presentational.
 */
export interface DashboardViewModel {
  /** Recent bulletins (up to 5) */
  bulletins: DashboardBulletin[];
  bulletinTotal: number;
  /** Upcoming events (next 30 days, up to 5) */
  events: DashboardEvent[];
  eventTotal: number;
  /** Recent people (up to 5) */
  people: DashboardPerson[];
  peopleTotal: number;
  /** Active announcements (up to 3) */
  announcements: DashboardAnnouncement[];
  /** Loading states */
  isLoading: boolean;
}

/**
 * Props for both dashboard view variants
 */
export interface DashboardViewProps {
  viewModel: DashboardViewModel;
}

/**
 * Bulletins View Model Types
 *
 * Shared types for the Bulletins container + dual view pattern.
 * Both BulletinsModernView and BulletinsAccessibleView accept these same props.
 */

/**
 * Bulletin summary for list display
 */
export interface BulletinListItem {
  id: string;
  serviceDate: string | Date;
  status: 'draft' | 'built' | 'approved' | 'locked' | 'deleted';
  createdAt: string | Date;
  deletedAt?: string | Date | null;
}

/**
 * Filter options for bulletin list
 */
export type BulletinFilter = 'active' | 'drafts' | 'deleted' | 'all';

/**
 * View model passed from BulletinsContainer to both view variants.
 * All data fetching happens in the container; views are purely presentational.
 */
export interface BulletinsViewModel {
  /** List of bulletins matching current filter */
  bulletins: BulletinListItem[];
  /** Total count of bulletins */
  total: number;
  /** Current filter selection */
  filter: BulletinFilter;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Actions available to views (passed from container)
 */
export interface BulletinsViewActions {
  /** Change the filter */
  onFilterChange: (filter: BulletinFilter) => void;
}

/**
 * Props for both bulletins view variants
 */
export interface BulletinsViewProps {
  viewModel: BulletinsViewModel;
  actions: BulletinsViewActions;
}

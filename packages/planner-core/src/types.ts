/**
 * Planner Core Types
 *
 * Generic type definitions for planner-based applications.
 * These types define the structure for plans containing sections and items.
 *
 * This module is intentionally UI-agnostic and can be reused across projects.
 */

/**
 * Canonical set of planner item types.
 *
 * These types represent common elements in service/event planning:
 * - song: Musical elements, hymns, worship songs
 * - scripture: Readings, responsive readings
 * - prayer: Various types of prayers
 * - communion: Lord's Supper, communion elements
 * - announcement: News, updates, information
 * - offering: Collection, giving moments
 * - sermon: Messages, teaching, homilies
 * - transition: Interludes, pauses, moments of silence
 * - note: Generic/misc items, instructions
 */
export type PlannerItemType =
  | 'song'
  | 'scripture'
  | 'prayer'
  | 'communion'
  | 'announcement'
  | 'offering'
  | 'sermon'
  | 'transition'
  | 'note';

/**
 * All valid planner item types as an array
 */
export const PLANNER_ITEM_TYPES_LIST: PlannerItemType[] = [
  'song',
  'scripture',
  'prayer',
  'communion',
  'announcement',
  'offering',
  'sermon',
  'transition',
  'note',
];

/**
 * Status of a plan (draft or published/finalized)
 */
export type PlannerPlanStatus = 'draft' | 'published';

/**
 * Base interface for a planner item.
 * Projects can extend this with additional fields as needed.
 */
export interface PlannerItem {
  /** Unique identifier for the item */
  id: string;
  /** Type of the item */
  type: PlannerItemType;
  /** Display title */
  title: string;
  /** Optional subtitle or additional info */
  subtitle?: string;
  /** Duration in minutes */
  duration: number;
  /** Calculated start time (set at runtime) */
  startTime?: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Base interface for a planner section.
 * A section groups related items together.
 */
export interface PlannerSection<TItem extends PlannerItem = PlannerItem> {
  /** Unique identifier for the section */
  id: string;
  /** Section title/name */
  title: string;
  /** Items within this section */
  items: TItem[];
}

/**
 * Base interface for a planner plan.
 * A plan is the top-level container with metadata and sections.
 */
export interface PlannerPlan<
  TSection extends PlannerSection = PlannerSection,
> {
  /** Unique identifier for the plan */
  id: string;
  /** Date of the plan (ISO date string YYYY-MM-DD) */
  date: string;
  /** Start time (e.g., "10:00 AM") */
  startTime: string;
  /** Plan status */
  status: PlannerPlanStatus;
  /** Sections containing items */
  sections: TSection[];
}

/**
 * Calculate total duration of a section in minutes
 */
export function calculateSectionDuration<TItem extends PlannerItem>(
  section: PlannerSection<TItem>
): number {
  return section.items.reduce((total, item) => total + item.duration, 0);
}

/**
 * Calculate total duration of a plan in minutes
 */
export function calculatePlanDuration<
  TSection extends PlannerSection,
>(plan: PlannerPlan<TSection>): number {
  return plan.sections.reduce(
    (total, section) => total + calculateSectionDuration(section),
    0
  );
}

/**
 * Format duration in minutes to human-readable string
 * Examples: "45 min", "1h 15m", "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

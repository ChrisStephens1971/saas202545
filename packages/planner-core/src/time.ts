/**
 * Time Utilities for Planner Core
 *
 * Pure calculation functions for computing item start times,
 * total duration, and end times. These functions are immutable
 * and do not modify input objects.
 *
 * All time strings use 12-hour format with AM/PM (e.g., "10:00 AM").
 */

import type { PlannerPlan, PlannerSection, PlannerItem } from './types';

/**
 * Parse a time string like "10:00 AM" to total minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}

/**
 * Format minutes since midnight to a time string like "10:00 AM"
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const isPM = hour >= 12;
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${isPM ? 'PM' : 'AM'}`;
}

/**
 * Compute item start times for all items in a plan.
 * Returns a new Map of item IDs to start time strings.
 *
 * This function is generic and works with any plan structure that conforms
 * to the PlannerPlan interface.
 */
export function computeItemStartTimes<
  TItem extends PlannerItem,
  TSection extends PlannerSection<TItem>,
  TPlan extends PlannerPlan<TSection>,
>(plan: TPlan): Map<string, string> {
  const startTimes = new Map<string, string>();
  let currentMinutes = parseTimeToMinutes(plan.startTime);

  for (const section of plan.sections) {
    for (const item of section.items) {
      startTimes.set(item.id, formatMinutesToTime(currentMinutes));
      currentMinutes += item.duration;
    }
  }

  return startTimes;
}

/**
 * Compute total duration of a plan in minutes.
 *
 * This function is generic and works with any plan structure that conforms
 * to the PlannerPlan interface.
 */
export function computeTotalDurationMinutes<
  TItem extends PlannerItem,
  TSection extends PlannerSection<TItem>,
  TPlan extends PlannerPlan<TSection>,
>(plan: TPlan): number {
  return plan.sections.reduce(
    (total, section) =>
      total + section.items.reduce((sectionTotal, item) => sectionTotal + item.duration, 0),
    0
  );
}

/**
 * Compute the end time of a plan based on start time and total duration.
 */
export function computeEndTime<
  TItem extends PlannerItem,
  TSection extends PlannerSection<TItem>,
  TPlan extends PlannerPlan<TSection>,
>(plan: TPlan): string {
  const startMinutes = parseTimeToMinutes(plan.startTime);
  const totalDuration = computeTotalDurationMinutes(plan);
  return formatMinutesToTime(startMinutes + totalDuration);
}

/**
 * Format duration in minutes to human-readable string.
 * Examples: "45 min", "1h 15m", "2h"
 *
 * Note: This is also exported from types.ts, but included here
 * for convenience when using time utilities.
 */
export function formatDurationDisplay(minutes: number): string {
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

/**
 * Add minutes to a time string and return the new time string.
 * Useful for calculating offsets.
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const startMinutes = parseTimeToMinutes(timeStr);
  return formatMinutesToTime(startMinutes + minutes);
}

/**
 * Outline Generation for Planner Core
 *
 * Generates plain text outlines from planner data.
 * This module is UI-agnostic and produces pure text output.
 *
 * The generated outline is suitable for:
 * - Email sharing
 * - Printing
 * - Archiving
 * - Quick reference
 */

import type { PlannerPlan, PlannerSection, PlannerItem } from './types';
import { formatDuration } from './types';
import { computeItemStartTimes, computeTotalDurationMinutes, computeEndTime } from './time';
import { PLANNER_ITEM_TYPE_MAP } from './itemTypes';

/**
 * Options for outline generation
 */
export interface OutlineOptions {
  /** Custom header text (default: "Plan") */
  headerPrefix?: string;
  /** Whether to include notes in output (default: true) */
  includeNotes?: boolean;
  /** Whether to include extra item details like CCLI, scripture refs (default: true) */
  includeExtraDetails?: boolean;
  /** Custom footer text (default: none) */
  footerText?: string;
  /** Custom date formatter (default: locale string) */
  dateFormatter?: (dateStr: string) => string;
  /** Custom item type label lookup (for project-specific labels) */
  getItemTypeLabel?: (type: string) => string;
}

/**
 * Default date formatter - produces locale-formatted date string
 */
function defaultDateFormatter(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Default item type label getter
 */
function defaultGetItemTypeLabel(type: string): string {
  const definition = PLANNER_ITEM_TYPE_MAP[type as keyof typeof PLANNER_ITEM_TYPE_MAP];
  return definition?.label ?? type;
}

/**
 * Extended item interface for extra details that some planners may have
 */
interface ExtendedPlannerItem extends PlannerItem {
  ccliNumber?: string;
  scriptureRef?: string;
}

/**
 * Generate a plain text outline of a planner plan.
 *
 * Output format:
 * ```
 * Plan - Sunday, March 9, 2025
 * Start: 9:00 AM   End: 10:15 AM   Total: 75 min
 * Status: Draft
 *
 * 1) Welcome & Announcements
 *    9:00 AM - Announcement - "Welcome" (5 min)
 *
 * 2) Worship Set
 *    9:05 AM - Song - "How Great Thou Art" (4 min)
 * ```
 */
export function generatePlanOutline<
  TItem extends PlannerItem,
  TSection extends PlannerSection<TItem>,
  TPlan extends PlannerPlan<TSection>,
>(plan: TPlan, options: OutlineOptions = {}): string {
  const {
    headerPrefix = 'Plan',
    includeNotes = true,
    includeExtraDetails = true,
    footerText,
    dateFormatter = defaultDateFormatter,
    getItemTypeLabel = defaultGetItemTypeLabel,
  } = options;

  const startTimes = computeItemStartTimes(plan);
  const totalMinutes = computeTotalDurationMinutes(plan);
  const totalDurationStr = formatDuration(totalMinutes);
  const endTimeStr = computeEndTime(plan);

  const lines: string[] = [];

  // Header
  lines.push(`${headerPrefix} - ${dateFormatter(plan.date)}`);
  lines.push(`Start: ${plan.startTime}   End: ${endTimeStr}   Total: ${totalDurationStr}`);
  lines.push(`Status: ${plan.status === 'published' ? 'Published' : 'Draft'}`);
  lines.push('');

  // Sections
  if (plan.sections.length === 0) {
    lines.push('(No sections in this plan)');
  } else {
    plan.sections.forEach((section, sectionIndex) => {
      lines.push(`${sectionIndex + 1}) ${section.title}`);

      if (section.items.length === 0) {
        lines.push('   (No items in this section)');
      } else {
        section.items.forEach((item) => {
          const startTime = startTimes.get(item.id) || '';
          const typeLabel = getItemTypeLabel(item.type);

          let itemLine = `   ${startTime} - ${typeLabel} - "${item.title}"`;
          if (item.subtitle) {
            itemLine += ` (${item.subtitle})`;
          }
          itemLine += ` [${item.duration} min]`;
          lines.push(itemLine);

          // Add additional details on separate lines if enabled
          if (includeExtraDetails) {
            const extItem = item as ExtendedPlannerItem;
            if (extItem.scriptureRef) {
              lines.push(`      Scripture: ${extItem.scriptureRef}`);
            }
            if (extItem.ccliNumber) {
              lines.push(`      CCLI: ${extItem.ccliNumber}`);
            }
          }

          if (includeNotes && item.notes) {
            lines.push(`      Notes: ${item.notes}`);
          }
        });
      }

      lines.push(''); // Blank line between sections
    });
  }

  // Footer
  if (footerText) {
    lines.push('---');
    lines.push(footerText);
  }

  return lines.join('\n');
}

/**
 * Generate a minimal outline with just section titles and item counts.
 * Useful for quick summaries or table of contents.
 */
export function generateMinimalOutline<
  TItem extends PlannerItem,
  TSection extends PlannerSection<TItem>,
  TPlan extends PlannerPlan<TSection>,
>(plan: TPlan): string {
  const lines: string[] = [];

  lines.push(`Plan: ${plan.date}`);
  lines.push(`Start: ${plan.startTime}`);
  lines.push('');

  plan.sections.forEach((section, index) => {
    lines.push(`${index + 1}. ${section.title} (${section.items.length} items)`);
  });

  return lines.join('\n');
}

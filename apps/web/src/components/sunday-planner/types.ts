/**
 * Sunday Planner Types
 *
 * Church-specific type definitions for the Service Plan feature.
 * Extends the generic planner-core types with church-specific fields.
 *
 * Phase 9: Refactored to use @elder-first/planner-core
 */

// Re-export core types for convenience
export type {
  PlannerItemType as ServiceItemType,
  PlannerPlanStatus as ServicePlanStatus,
} from '@elder-first/planner-core';

export {
  PLANNER_ITEM_TYPES_LIST,
  calculateSectionDuration,
  calculatePlanDuration as calculateTotalDuration,
  formatDuration,
} from '@elder-first/planner-core';

// Also re-export time utilities that were previously in this file
export {
  computeItemStartTimes as calculateStartTimes,
} from '@elder-first/planner-core';

import type { PlannerItem, PlannerSection, PlannerPlan, PlannerItemType } from '@elder-first/planner-core';

/**
 * Church-specific service item with additional fields
 */
export interface ServiceItemData extends PlannerItem {
  /** For songs - CCLI license number */
  ccliNumber?: string;
  /** For readings - scripture reference */
  scriptureRef?: string;
  /** Count of attachments */
  attachments?: number;
}

/**
 * Church-specific section (same as base for now)
 */
export interface ServiceSectionData extends PlannerSection<ServiceItemData> {}

/**
 * Church-specific service plan
 */
export interface ServicePlanData extends PlannerPlan<ServiceSectionData> {}

/**
 * Type guard to check if a type is a valid service item type
 */
export function isValidServiceItemType(type: string): type is PlannerItemType {
  return [
    'song',
    'scripture',
    'prayer',
    'communion',
    'announcement',
    'offering',
    'sermon',
    'transition',
    'note',
  ].includes(type);
}

/**
 * @elder-first/planner-core
 *
 * Reusable planner core logic for service/event planning applications.
 *
 * This package provides:
 * - Type definitions for plans, sections, and items
 * - Item type definitions with labels and defaults
 * - Time calculation utilities
 * - Outline/text generation
 *
 * Usage:
 * ```typescript
 * import {
 *   PlannerPlan,
 *   PlannerSection,
 *   PlannerItem,
 *   computeItemStartTimes,
 *   computeEndTime,
 *   generatePlanOutline,
 * } from '@elder-first/planner-core';
 * ```
 */

// Types
export type {
  PlannerItemType,
  PlannerPlanStatus,
  PlannerItem,
  PlannerSection,
  PlannerPlan,
} from './types';

export {
  PLANNER_ITEM_TYPES_LIST,
  calculateSectionDuration,
  calculatePlanDuration,
  formatDuration,
} from './types';

// Item type definitions
export type { PlannerItemTypeDefinition } from './itemTypes';

export {
  PLANNER_ITEM_TYPES,
  PLANNER_ITEM_TYPE_MAP,
  getItemTypeDefinition,
  DEFAULT_QUICK_ADD_TYPES,
  DEFAULT_ITEM_DURATION_MINUTES,
} from './itemTypes';

// Time utilities
export {
  parseTimeToMinutes,
  formatMinutesToTime,
  computeItemStartTimes,
  computeTotalDurationMinutes,
  computeEndTime,
  formatDurationDisplay,
  addMinutesToTime,
} from './time';

// Outline generation
export type { OutlineOptions } from './outline';

export {
  generatePlanOutline,
  generateMinimalOutline,
} from './outline';

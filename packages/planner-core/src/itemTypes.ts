/**
 * Planner Item Type Definitions
 *
 * Central configuration for planner item types.
 * This module defines the semantic meaning, labels, and defaults for each type.
 *
 * Note: Icons and styling are intentionally NOT included here.
 * UI-specific customization should be added at the application level.
 */

import type { PlannerItemType } from './types';

/**
 * Definition for a planner item type (UI-agnostic)
 */
export interface PlannerItemTypeDefinition {
  /** The type identifier */
  type: PlannerItemType;
  /** Human-readable label */
  label: string;
  /** Short description of this type's purpose */
  description: string;
  /** Default duration in minutes for new items of this type */
  defaultDurationMinutes: number;
}

/**
 * Ordered list of all planner item types with their definitions
 */
export const PLANNER_ITEM_TYPES: PlannerItemTypeDefinition[] = [
  {
    type: 'song',
    label: 'Song',
    description: 'Hymns, worship songs, special music',
    defaultDurationMinutes: 4,
  },
  {
    type: 'scripture',
    label: 'Scripture',
    description: 'Bible readings, responsive readings',
    defaultDurationMinutes: 3,
  },
  {
    type: 'prayer',
    label: 'Prayer',
    description: 'Opening, pastoral, closing prayers',
    defaultDurationMinutes: 3,
  },
  {
    type: 'communion',
    label: 'Communion',
    description: "Lord's Supper, communion elements",
    defaultDurationMinutes: 10,
  },
  {
    type: 'announcement',
    label: 'Announcement',
    description: 'Announcements, news, updates',
    defaultDurationMinutes: 3,
  },
  {
    type: 'offering',
    label: 'Offering',
    description: 'Collection, giving moment',
    defaultDurationMinutes: 5,
  },
  {
    type: 'sermon',
    label: 'Sermon',
    description: 'Message, homily, teaching',
    defaultDurationMinutes: 25,
  },
  {
    type: 'transition',
    label: 'Transition',
    description: 'Musical interludes, moment of silence',
    defaultDurationMinutes: 2,
  },
  {
    type: 'note',
    label: 'Note',
    description: 'Generic items, instructions',
    defaultDurationMinutes: 3,
  },
];

/**
 * Map of item type to definition for O(1) lookups
 */
export const PLANNER_ITEM_TYPE_MAP: Record<PlannerItemType, PlannerItemTypeDefinition> =
  PLANNER_ITEM_TYPES.reduce(
    (map, definition) => {
      map[definition.type] = definition;
      return map;
    },
    {} as Record<PlannerItemType, PlannerItemTypeDefinition>
  );

/**
 * Get definition for an item type with fallback for unknown types
 */
export function getItemTypeDefinition(type: PlannerItemType): PlannerItemTypeDefinition {
  return PLANNER_ITEM_TYPE_MAP[type] ?? PLANNER_ITEM_TYPE_MAP['note'];
}

/**
 * Default item types for quick-add functionality
 */
export const DEFAULT_QUICK_ADD_TYPES: PlannerItemType[] = ['song', 'prayer', 'note'];

/**
 * Default fallback duration for items with missing duration
 */
export const DEFAULT_ITEM_DURATION_MINUTES = 3;

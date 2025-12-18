/**
 * Service Item Type Configuration
 *
 * Church-specific UI configuration for item types.
 * Extends the core item type definitions with icons and styling.
 *
 * Phase 9: Refactored to use @elder-first/planner-core
 */

import {
  Music,
  BookOpen,
  Heart,
  Grape,
  Megaphone,
  CircleDollarSign,
  Mic,
  Clock,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

import type { PlannerItemType, PlannerItemTypeDefinition } from '@elder-first/planner-core';
import {
  PLANNER_ITEM_TYPES,
  PLANNER_ITEM_TYPE_MAP,
  DEFAULT_QUICK_ADD_TYPES,
  DEFAULT_ITEM_DURATION_MINUTES,
} from '@elder-first/planner-core';

// Re-export core exports for backward compatibility
export {
  DEFAULT_QUICK_ADD_TYPES as QUICK_ADD_TYPES,
  DEFAULT_ITEM_DURATION_MINUTES,
};

// Re-export ServiceItemType alias
export type { PlannerItemType as ServiceItemType } from '@elder-first/planner-core';

/**
 * UI-specific configuration for a service item type
 * Extends the core definition with icon and styling
 */
export interface ServiceItemTypeConfig extends PlannerItemTypeDefinition {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Background color class for icon container */
  iconBgClass: string;
  /** Text color class for icon */
  iconTextClass: string;
}

/**
 * Icon mapping for each item type
 */
const ITEM_TYPE_ICONS: Record<PlannerItemType, LucideIcon> = {
  song: Music,
  scripture: BookOpen,
  prayer: Heart,
  communion: Grape,
  announcement: Megaphone,
  offering: CircleDollarSign,
  sermon: Mic,
  transition: Clock,
  note: StickyNote,
};

/**
 * Color classes for each item type
 */
const ITEM_TYPE_COLORS: Record<PlannerItemType, { bg: string; text: string }> = {
  song: { bg: 'bg-purple-100', text: 'text-purple-600' },
  scripture: { bg: 'bg-blue-100', text: 'text-blue-600' },
  prayer: { bg: 'bg-pink-100', text: 'text-pink-600' },
  communion: { bg: 'bg-red-100', text: 'text-red-600' },
  announcement: { bg: 'bg-amber-100', text: 'text-amber-600' },
  offering: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  sermon: { bg: 'bg-teal-100', text: 'text-teal-600' },
  transition: { bg: 'bg-slate-100', text: 'text-slate-600' },
  note: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

/**
 * Ordered list of all service item types with UI configurations
 */
export const SERVICE_ITEM_TYPES: ServiceItemTypeConfig[] = PLANNER_ITEM_TYPES.map(
  (definition): ServiceItemTypeConfig => ({
    ...definition,
    icon: ITEM_TYPE_ICONS[definition.type],
    iconBgClass: ITEM_TYPE_COLORS[definition.type].bg,
    iconTextClass: ITEM_TYPE_COLORS[definition.type].text,
  })
);

/**
 * Map of item type to UI configuration for O(1) lookups
 */
export const SERVICE_ITEM_TYPE_MAP: Record<PlannerItemType, ServiceItemTypeConfig> =
  SERVICE_ITEM_TYPES.reduce(
    (map, config) => {
      map[config.type] = config;
      return map;
    },
    {} as Record<PlannerItemType, ServiceItemTypeConfig>
  );

/**
 * Get UI configuration for an item type with fallback for unknown types
 */
export function getItemTypeConfig(type: PlannerItemType): ServiceItemTypeConfig {
  return SERVICE_ITEM_TYPE_MAP[type] ?? SERVICE_ITEM_TYPE_MAP['note'];
}

/**
 * Get just the core definition (without UI) for an item type
 * Useful when you only need label/duration
 */
export function getItemTypeDefinition(type: PlannerItemType): PlannerItemTypeDefinition {
  return PLANNER_ITEM_TYPE_MAP[type] ?? PLANNER_ITEM_TYPE_MAP['note'];
}

/**
 * Planner Generator
 *
 * Generates a planner module scaffold for a new vertical using @elder-first/planner-core.
 *
 * This generator creates:
 * - types.ts: Extended types for the vertical
 * - itemTypeConfig.ts: UI configuration for item types
 * - timeUtils.ts: Wrapper around core time utilities
 * - outlineUtils.ts: Wrapper around core outline generator
 * - index.ts: Barrel export
 *
 * It does NOT generate:
 * - UI components (React, Vue, etc.)
 * - Database schemas
 * - API routes
 * - Authentication logic
 *
 * Security: This generator cannot modify auth, RLS, or database schemas.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Generator parameters
 */
export interface PlannerGeneratorParams {
  /** Name of the vertical (e.g., "meeting", "event", "production") */
  verticalName: string;
  /** Base path where the planner folder will be created */
  pathBase: string;
  /** Optional: Pascal case name for types (auto-generated if not provided) */
  typeName?: string;
  /** Optional: Custom item types for this vertical */
  itemTypes?: VerticalItemType[];
  /** Optional: Additional fields to add to the plan type */
  planFields?: FieldDefinition[];
  /** Optional: Additional fields to add to the item type */
  itemFields?: FieldDefinition[];
}

/**
 * Definition for a custom item type
 */
export interface VerticalItemType {
  type: string;
  label: string;
  description: string;
  defaultDuration: number;
  iconName: string;
  bgColor: string;
  textColor: string;
}

/**
 * Definition for an additional field
 */
export interface FieldDefinition {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

/**
 * Result of the generator
 */
export interface GeneratorResult {
  success: boolean;
  createdFiles: string[];
  errors: string[];
  outputPath: string;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generate the types.ts file content
 */
function generateTypesFile(params: PlannerGeneratorParams): string {
  const typeName = params.typeName || toPascalCase(params.verticalName);
  const itemFields = params.itemFields || [];
  const planFields = params.planFields || [];

  const itemFieldsStr = itemFields
    .map((f) => `  /** ${f.description || f.name} */\n  ${f.name}${f.optional ? '?' : ''}: ${f.type};`)
    .join('\n');

  const planFieldsStr = planFields
    .map((f) => `  /** ${f.description || f.name} */\n  ${f.name}${f.optional ? '?' : ''}: ${f.type};`)
    .join('\n');

  return `/**
 * ${typeName} Planner Types
 *
 * Extended types for the ${params.verticalName} planner vertical.
 * These types extend the base types from @elder-first/planner-core.
 */

import type {
  PlannerItem,
  PlannerSection,
  PlannerPlan,
} from '@elder-first/planner-core';

/**
 * ${typeName}-specific item data
 */
export interface ${typeName}ItemData extends PlannerItem {
${itemFieldsStr || '  // Add vertical-specific item fields here'}
}

/**
 * ${typeName} section containing ${typeName}ItemData items
 */
export interface ${typeName}SectionData extends PlannerSection<${typeName}ItemData> {}

/**
 * ${typeName} plan containing ${typeName}SectionData sections
 */
export interface ${typeName}PlanData extends PlannerPlan<${typeName}SectionData> {
${planFieldsStr || '  // Add vertical-specific plan fields here'}
}

/**
 * Item type specific to ${params.verticalName} vertical
 */
export type ${typeName}ItemType = ${typeName}ItemData['type'];
`;
}

/**
 * Generate the itemTypeConfig.ts file content
 */
function generateItemTypeConfigFile(params: PlannerGeneratorParams): string {
  const typeName = params.typeName || toPascalCase(params.verticalName);
  const camelName = toCamelCase(params.verticalName);

  // Default item types if none provided
  const itemTypes = params.itemTypes || [
    {
      type: 'discussion',
      label: 'Discussion',
      description: 'Open discussion topic',
      defaultDuration: 15,
      iconName: 'MessageSquare',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    {
      type: 'presentation',
      label: 'Presentation',
      description: 'Prepared presentation or demo',
      defaultDuration: 20,
      iconName: 'FileText',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
    },
    {
      type: 'break',
      label: 'Break',
      description: 'Scheduled break',
      defaultDuration: 5,
      iconName: 'Clock',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
    },
    {
      type: 'note',
      label: 'Note',
      description: 'General note or instruction',
      defaultDuration: 0,
      iconName: 'StickyNote',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
    },
  ];

  // Collect unique icon names
  const iconNames = Array.from(new Set(itemTypes.map((t) => t.iconName)));

  const itemTypesStr = itemTypes
    .map(
      (t) => `  {
    type: '${t.type}',
    label: '${t.label}',
    description: '${t.description}',
    defaultDurationMinutes: ${t.defaultDuration},
    icon: ${t.iconName},
    bgColor: '${t.bgColor}',
    textColor: '${t.textColor}',
  }`
    )
    .join(',\n');

  return `/**
 * ${typeName} Item Type Configuration
 *
 * UI-specific configuration for ${params.verticalName} planner item types.
 * Icons and colors live here, not in planner-core.
 */

import type { PlannerItemTypeDefinition } from '@elder-first/planner-core';
import { ${iconNames.join(', ')} } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Extended item type definition with UI properties
 */
export interface ${typeName}ItemTypeConfig extends PlannerItemTypeDefinition {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
}

/**
 * Item type definitions for ${params.verticalName} planner
 */
export const ${typeName.toUpperCase()}_ITEM_TYPES: ${typeName}ItemTypeConfig[] = [
${itemTypesStr}
];

/**
 * Map for O(1) item type lookup
 */
export const ${typeName.toUpperCase()}_ITEM_TYPE_MAP = new Map<string, ${typeName}ItemTypeConfig>(
  ${typeName.toUpperCase()}_ITEM_TYPES.map((t) => [t.type, t])
);

/**
 * Get item type configuration by type string
 */
export function get${typeName}ItemConfig(type: string): ${typeName}ItemTypeConfig {
  return ${typeName.toUpperCase()}_ITEM_TYPE_MAP.get(type) ?? ${typeName.toUpperCase()}_ITEM_TYPES[0];
}
`;
}

/**
 * Generate the timeUtils.ts file content
 */
function generateTimeUtilsFile(params: PlannerGeneratorParams): string {
  const typeName = params.typeName || toPascalCase(params.verticalName);

  return `/**
 * ${typeName} Time Utilities
 *
 * Wrappers around @elder-first/planner-core time utilities
 * with ${params.verticalName}-specific typing.
 */

import {
  computeItemStartTimes,
  computeEndTime,
  computeTotalDurationMinutes,
  formatMinutesToTime,
  formatDurationDisplay,
  parseTimeToMinutes,
} from '@elder-first/planner-core';
import type { ${typeName}PlanData } from './types';

// Re-export core utilities for convenience
export {
  formatMinutesToTime,
  formatDurationDisplay,
  parseTimeToMinutes,
};

/**
 * Compute start times for all items in a ${params.verticalName} plan
 */
export function compute${typeName}StartTimes(plan: ${typeName}PlanData): Map<string, string> {
  return computeItemStartTimes(plan);
}

/**
 * Compute the end time for a ${params.verticalName} plan
 */
export function compute${typeName}EndTime(plan: ${typeName}PlanData): string {
  return computeEndTime(plan);
}

/**
 * Compute total duration of a ${params.verticalName} plan in minutes
 */
export function compute${typeName}Duration(plan: ${typeName}PlanData): number {
  return computeTotalDurationMinutes(plan);
}
`;
}

/**
 * Generate the outlineUtils.ts file content
 */
function generateOutlineUtilsFile(params: PlannerGeneratorParams): string {
  const typeName = params.typeName || toPascalCase(params.verticalName);

  return `/**
 * ${typeName} Outline Utilities
 *
 * Wrappers around @elder-first/planner-core outline generator
 * with ${params.verticalName}-specific customization.
 */

import { generatePlanOutline, generateMinimalOutline } from '@elder-first/planner-core';
import type { ${typeName}PlanData } from './types';
import { get${typeName}ItemConfig } from './itemTypeConfig';

/**
 * Generate a formatted outline for a ${params.verticalName} plan
 */
export function generate${typeName}Outline(
  plan: ${typeName}PlanData,
  options?: {
    includeNotes?: boolean;
    headerPrefix?: string;
    footerText?: string;
  }
): string {
  return generatePlanOutline(plan, {
    headerPrefix: options?.headerPrefix ?? '${typeName} Plan',
    includeNotes: options?.includeNotes ?? true,
    getItemTypeLabel: (type) => get${typeName}ItemConfig(type).label,
    footerText: options?.footerText,
  });
}

/**
 * Generate a minimal outline (summary only)
 */
export function generate${typeName}Summary(plan: ${typeName}PlanData): string {
  return generateMinimalOutline(plan);
}
`;
}

/**
 * Generate the index.ts barrel export file
 */
function generateIndexFile(params: PlannerGeneratorParams): string {
  const typeName = params.typeName || toPascalCase(params.verticalName);

  return `/**
 * ${typeName} Planner Module
 *
 * Barrel export for ${params.verticalName} planner functionality.
 */

// Types
export type {
  ${typeName}ItemData,
  ${typeName}SectionData,
  ${typeName}PlanData,
  ${typeName}ItemType,
} from './types';

// Item type configuration
export {
  ${typeName.toUpperCase()}_ITEM_TYPES,
  ${typeName.toUpperCase()}_ITEM_TYPE_MAP,
  get${typeName}ItemConfig,
} from './itemTypeConfig';
export type { ${typeName}ItemTypeConfig } from './itemTypeConfig';

// Time utilities
export {
  compute${typeName}StartTimes,
  compute${typeName}EndTime,
  compute${typeName}Duration,
  formatMinutesToTime,
  formatDurationDisplay,
  parseTimeToMinutes,
} from './timeUtils';

// Outline utilities
export {
  generate${typeName}Outline,
  generate${typeName}Summary,
} from './outlineUtils';

// Re-export commonly used core types
export type {
  PlannerItemType,
  PlannerItemTypeDefinition,
  PlannerPlanStatus,
} from '@elder-first/planner-core';
`;
}

/**
 * Main generator function
 *
 * @param params - Generator parameters
 * @returns Generator result with created files and any errors
 */
export function generatePlannerModule(params: PlannerGeneratorParams): GeneratorResult {
  const result: GeneratorResult = {
    success: false,
    createdFiles: [],
    errors: [],
    outputPath: '',
  };

  try {
    // Validate params
    if (!params.verticalName || !params.verticalName.trim()) {
      result.errors.push('verticalName is required');
      return result;
    }

    if (!params.pathBase || !params.pathBase.trim()) {
      result.errors.push('pathBase is required');
      return result;
    }

    // Sanitize vertical name
    const sanitizedName = params.verticalName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    // Create output directory path
    const outputPath = path.join(params.pathBase, sanitizedName, 'planner');
    result.outputPath = outputPath;

    // Create directory if it doesn't exist
    fs.mkdirSync(outputPath, { recursive: true });

    // Generate and write files
    const files: { name: string; content: string }[] = [
      { name: 'types.ts', content: generateTypesFile(params) },
      { name: 'itemTypeConfig.ts', content: generateItemTypeConfigFile(params) },
      { name: 'timeUtils.ts', content: generateTimeUtilsFile(params) },
      { name: 'outlineUtils.ts', content: generateOutlineUtilsFile(params) },
      { name: 'index.ts', content: generateIndexFile(params) },
    ];

    for (const file of files) {
      const filePath = path.join(outputPath, file.name);
      fs.writeFileSync(filePath, file.content, 'utf-8');
      result.createdFiles.push(filePath);
    }

    result.success = true;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

/**
 * Dry-run generator that returns what would be created without writing files
 */
export function previewPlannerModule(params: PlannerGeneratorParams): {
  outputPath: string;
  files: { name: string; content: string }[];
} {
  const sanitizedName = params.verticalName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const outputPath = path.join(params.pathBase, sanitizedName, 'planner');

  return {
    outputPath,
    files: [
      { name: 'types.ts', content: generateTypesFile(params) },
      { name: 'itemTypeConfig.ts', content: generateItemTypeConfigFile(params) },
      { name: 'timeUtils.ts', content: generateTimeUtilsFile(params) },
      { name: 'outlineUtils.ts', content: generateOutlineUtilsFile(params) },
      { name: 'index.ts', content: generateIndexFile(params) },
    ],
  };
}

// Default export
export default generatePlannerModule;

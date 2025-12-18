/**
 * Download Utilities for Sunday Planner
 *
 * Provides functions for exporting service plans in various formats:
 * - JSON (for import/export, debugging)
 * - Text outline (human-readable)
 *
 * Phase 9: Refactored to use @elder-first/planner-core for outline generation
 */

import type { ServicePlanData } from './types';
import { generatePlanOutline } from '@elder-first/planner-core';
import { SERVICE_ITEM_TYPE_MAP } from './itemTypeConfig';

/**
 * Trigger a file download in the browser
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for filenames (YYYY-MM-DD)
 */
function formatDateForFilename(dateStr: string): string {
  return dateStr; // Already in ISO format
}

/**
 * Download the service plan as JSON
 *
 * Useful for:
 * - Debugging
 * - Future import functionality
 * - Power users who want to archive or process data
 */
export function downloadPlanAsJson(plan: ServicePlanData): void {
  const content = JSON.stringify(plan, null, 2);
  const filename = `service-plan-${formatDateForFilename(plan.date)}.json`;
  triggerDownload(content, filename, 'application/json');
}

/**
 * Generate a plain text outline of the service plan
 * Uses the core outline generator with church-specific customizations
 */
export function generateTextOutline(plan: ServicePlanData): string {
  return generatePlanOutline(plan, {
    headerPrefix: 'Service Plan',
    includeNotes: true,
    includeExtraDetails: true,
    footerText: 'Generated from Elder-First Church Platform',
    getItemTypeLabel: (type) => SERVICE_ITEM_TYPE_MAP[type as keyof typeof SERVICE_ITEM_TYPE_MAP]?.label ?? type,
  });
}

/**
 * Download the service plan as a plain text outline
 */
export function downloadPlanAsText(plan: ServicePlanData): void {
  const content = generateTextOutline(plan);
  const filename = `service-plan-${formatDateForFilename(plan.date)}.txt`;
  triggerDownload(content, filename, 'text/plain');
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'text';

/**
 * Download the service plan in the specified format
 */
export function downloadPlan(plan: ServicePlanData, format: ExportFormat): void {
  switch (format) {
    case 'json':
      downloadPlanAsJson(plan);
      break;
    case 'text':
      downloadPlanAsText(plan);
      break;
    default:
      console.warn(`Unknown export format: ${format}`);
  }
}

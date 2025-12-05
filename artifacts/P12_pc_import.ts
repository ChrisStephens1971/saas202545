/**
 * P12_pc_import.ts
 * Planning Center CSV Import Service
 *
 * Imports Planning Center exports into ServiceItem and Event tables
 * Supports:
 * - Service Plans (songs, readings, sermon notes)
 * - Events/RSVPs
 * - People/Groups (future)
 *
 * Features:
 * - Idempotent (uses external IDs for deduplication)
 * - Configurable field mapping per church
 * - Validation with line numbers
 * - Skip/error reporting
 */

import { parse as parseCSV } from 'csv-parse/sync';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

interface ImportResult {
  success: boolean;
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  validationReport: ValidationError[];
}

interface ValidationError {
  line: number;
  field: string;
  message: string;
  value?: any;
}

interface MappingConfig {
  tenantId: string;
  importType: 'service_plan' | 'events' | 'people';
  fieldMappings: Record<string, string>; // CSV column → DB field
  defaults?: Record<string, any>; // Default values
  transformations?: Record<string, (value: any) => any>; // Custom transforms
}

interface ServicePlanRow {
  externalId: string; // Planning Center plan ID
  planDate: Date;
  planTitle?: string;
  itemType: 'song' | 'reading' | 'sermon' | 'announcement' | 'other';
  itemTitle: string;
  itemDuration?: number; // minutes
  itemNotes?: string;
  ccliNumber?: string; // Required for songs
  position: number; // Order in service
}

const ServicePlanSchema = z.object({
  externalId: z.string().min(1),
  planDate: z.date(),
  planTitle: z.string().max(100).optional(),
  itemType: z.enum(['song', 'reading', 'sermon', 'announcement', 'other']),
  itemTitle: z.string().min(1).max(100),
  itemDuration: z.number().min(0).max(300).optional(),
  itemNotes: z.string().max(500).optional(),
  ccliNumber: z.string().regex(/^\d+$/).optional(),
  position: z.number().int().min(1),
});

// ============================================================================
// Planning Center Import Service
// ============================================================================

export class PlanningCenterImportService {
  constructor(
    private db: any,
    private tenantId: string
  ) {}

  /**
   * Import service plan from Planning Center CSV
   */
  async importServicePlan(
    csvContent: string,
    mapping: MappingConfig
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      stats: { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
      validationReport: [],
    };

    try {
      // Parse CSV
      const records = parseCSV(csvContent, {
        columns: true, // First row is headers
        skip_empty_lines: true,
        trim: true,
      });

      result.stats.total = records.length;

      // Process each row
      for (let i = 0; i < records.length; i++) {
        const lineNumber = i + 2; // Account for header row + 0-index
        const row = records[i];

        try {
          // Map CSV columns to our schema
          const importRow = this.mapRow(row, mapping);

          // Validate
          const validation = ServicePlanSchema.safeParse(importRow);
          if (!validation.success) {
            validation.error.issues.forEach((issue) => {
              result.validationReport.push({
                line: lineNumber,
                field: issue.path.join('.'),
                message: issue.message,
                value: row[mapping.fieldMappings[issue.path[0] as string]],
              });
            });
            result.stats.errors++;
            continue;
          }

          const data = validation.data;

          // Validate business rules
          const businessValidation = this.validateBusinessRules(data, lineNumber);
          if (businessValidation.length > 0) {
            result.validationReport.push(...businessValidation);
            result.stats.errors++;
            continue;
          }

          // Check if plan exists (by external ID and date)
          const existingPlan = await this.db.servicePlan.findUnique({
            where: {
              tenant_external_date: {
                tenantId: this.tenantId,
                externalId: data.externalId,
                serviceDate: data.planDate,
              },
            },
            include: { items: true },
          });

          let planId: string;

          if (existingPlan) {
            // Check if this specific item exists
            const existingItem = existingPlan.items.find(
              (item: any) => item.position === data.position
            );

            if (existingItem) {
              // Update existing item
              await this.db.serviceItem.update({
                where: { id: existingItem.id },
                data: {
                  type: data.itemType,
                  title: data.itemTitle,
                  durationMinutes: data.itemDuration,
                  notes: data.itemNotes,
                  ccliNumber: data.ccliNumber,
                  updatedAt: new Date(),
                },
              });
              result.stats.updated++;
            } else {
              // Add new item to existing plan
              await this.db.serviceItem.create({
                data: {
                  servicePlanId: existingPlan.id,
                  type: data.itemType,
                  title: data.itemTitle,
                  position: data.position,
                  durationMinutes: data.itemDuration,
                  notes: data.itemNotes,
                  ccliNumber: data.ccliNumber,
                },
              });
              result.stats.created++;
            }
          } else {
            // Create new plan and first item
            const plan = await this.db.servicePlan.create({
              data: {
                tenantId: this.tenantId,
                externalId: data.externalId,
                serviceDate: data.planDate,
                title: data.planTitle || `Service - ${data.planDate.toDateString()}`,
                source: 'planning_center',
                items: {
                  create: {
                    type: data.itemType,
                    title: data.itemTitle,
                    position: data.position,
                    durationMinutes: data.itemDuration,
                    notes: data.itemNotes,
                    ccliNumber: data.ccliNumber,
                  },
                },
              },
            });
            result.stats.created++;
          }
        } catch (error) {
          result.stats.errors++;
          result.validationReport.push({
            line: lineNumber,
            field: 'row',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      result.success = result.stats.errors === 0;
    } catch (error) {
      result.success = false;
      result.validationReport.push({
        line: 0,
        field: 'file',
        message: error instanceof Error ? error.message : 'Failed to parse CSV',
      });
    }

    return result;
  }

  /**
   * Map CSV row to import row using mapping config
   */
  private mapRow(csvRow: Record<string, any>, mapping: MappingConfig): ServicePlanRow {
    const mapped: any = {};

    // Apply field mappings
    for (const [ourField, csvColumn] of Object.entries(mapping.fieldMappings)) {
      let value = csvRow[csvColumn];

      // Apply transformations if defined
      if (mapping.transformations && mapping.transformations[ourField]) {
        value = mapping.transformations[ourField](value);
      }

      // Handle type conversions
      if (ourField === 'planDate') {
        value = new Date(value);
      } else if (ourField === 'itemDuration' || ourField === 'position') {
        value = parseInt(value, 10);
      }

      mapped[ourField] = value;
    }

    // Apply defaults
    if (mapping.defaults) {
      for (const [field, value] of Object.entries(mapping.defaults)) {
        if (!mapped[field]) {
          mapped[field] = value;
        }
      }
    }

    return mapped;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(data: ServicePlanRow, line: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Songs must have CCLI number
    if (data.itemType === 'song' && !data.ccliNumber) {
      errors.push({
        line,
        field: 'ccliNumber',
        message: 'CCLI number is required for songs',
        value: data.itemTitle,
      });
    }

    // Duration can't exceed 5 hours (300 minutes)
    if (data.itemDuration && data.itemDuration > 300) {
      errors.push({
        line,
        field: 'itemDuration',
        message: 'Duration cannot exceed 300 minutes',
        value: data.itemDuration,
      });
    }

    // Plan date can't be more than 1 year in the past
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (data.planDate < oneYearAgo) {
      errors.push({
        line,
        field: 'planDate',
        message: 'Plan date cannot be more than 1 year in the past',
        value: data.planDate,
      });
    }

    return errors;
  }

  /**
   * Generate import summary report
   */
  generateReport(result: ImportResult): string {
    const lines: string[] = [
      '=== Planning Center Import Report ===',
      '',
      `Total rows: ${result.stats.total}`,
      `Created: ${result.stats.created}`,
      `Updated: ${result.stats.updated}`,
      `Skipped: ${result.stats.skipped}`,
      `Errors: ${result.stats.errors}`,
      '',
    ];

    if (result.validationReport.length > 0) {
      lines.push('Validation Errors:');
      lines.push('');

      result.validationReport.forEach((error) => {
        lines.push(
          `Line ${error.line}: [${error.field}] ${error.message}` +
          (error.value ? ` (value: "${error.value}")` : '')
        );
      });
    } else {
      lines.push('✓ No errors');
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect Planning Center CSV format
 */
export function detectPCFormat(csvContent: string): {
  format: 'service_plan' | 'events' | 'people' | 'unknown';
  confidence: number;
} {
  const firstLine = csvContent.split('\n')[0].toLowerCase();

  if (firstLine.includes('plan') && firstLine.includes('song')) {
    return { format: 'service_plan', confidence: 0.9 };
  } else if (firstLine.includes('event') && firstLine.includes('date')) {
    return { format: 'events', confidence: 0.8 };
  } else if (firstLine.includes('first name') || firstLine.includes('email')) {
    return { format: 'people', confidence: 0.8 };
  }

  return { format: 'unknown', confidence: 0 };
}

/**
 * Create default mapping config for Planning Center exports
 */
export function createDefaultMapping(tenantId: string): MappingConfig {
  return {
    tenantId,
    importType: 'service_plan',
    fieldMappings: {
      externalId: 'Plan ID',
      planDate: 'Service Date',
      planTitle: 'Plan Title',
      itemType: 'Item Type',
      itemTitle: 'Item Title',
      itemDuration: 'Duration',
      itemNotes: 'Notes',
      ccliNumber: 'CCLI',
      position: 'Order',
    },
    defaults: {
      itemType: 'other',
    },
    transformations: {
      itemType: (value: string) => {
        // Normalize item type
        const normalized = value.toLowerCase().trim();
        if (normalized.includes('song') || normalized.includes('hymn')) return 'song';
        if (normalized.includes('reading') || normalized.includes('scripture')) return 'reading';
        if (normalized.includes('sermon') || normalized.includes('message')) return 'sermon';
        if (normalized.includes('announcement')) return 'announcement';
        return 'other';
      },
    },
  };
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Import Planning Center service plan
 *
 * const service = new PlanningCenterImportService(prisma, 'tenant-123');
 *
 * const csvContent = await fs.readFile('service-plan.csv', 'utf-8');
 * const mapping = createDefaultMapping('tenant-123');
 *
 * const result = await service.importServicePlan(csvContent, mapping);
 *
 * console.log(service.generateReport(result));
 *
 * // Save mapping for next time
 * await prisma.importMapping.upsert({
 *   where: { tenantId_type: { tenantId: 'tenant-123', type: 'planning_center' } },
 *   create: { tenantId: 'tenant-123', type: 'planning_center', config: mapping },
 *   update: { config: mapping },
 * });
 */

export default PlanningCenterImportService;

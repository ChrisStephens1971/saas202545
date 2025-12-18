/**
 * Query Builder Utilities (Phase 2B)
 *
 * Helpers for building dynamic SQL queries safely and consistently.
 * These utilities eliminate brittle manual parameter indexing.
 *
 * @see docs/architecture/QUERY-PATTERNS.md
 */

import type { QueryParam } from '../db';

// ============================================================================
// PARTIAL UPDATE QUERY BUILDER
// ============================================================================

/**
 * Field mapping for converting camelCase input keys to snake_case columns.
 * Add common field mappings here.
 */
const DEFAULT_FIELD_MAPPINGS: Record<string, string> = {
  // Common fields
  personId: 'person_id',
  tenantId: 'tenant_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',

  // Prayer fields
  isUrgent: 'is_urgent',
  answerNote: 'answer_note',

  // Attendance fields
  eventId: 'event_id',
  groupId: 'group_id',
  sessionDate: 'session_date',
  sessionTime: 'session_time',

  // Event fields
  startDate: 'start_date',
  endDate: 'end_date',
  startTime: 'start_time',
  endTime: 'end_time',

  // Bulletin fields
  issueDate: 'issue_date',
  brandPackId: 'brand_pack_id',
  pdfUrl: 'pdf_url',
  pdfLargePrintUrl: 'pdf_large_print_url',
  slidesJson: 'slides_json',
  loopMp4Url: 'loop_mp4_url',
  emailHtml: 'email_html',
  propresenterBundleUrl: 'propresenter_bundle_url',
  lockedAt: 'locked_at',
  lockedBy: 'locked_by',
  reopenedAt: 'reopened_at',
  reopenedBy: 'reopened_by',
  reopenReason: 'reopen_reason',
  contentHash: 'content_hash',
  templateKey: 'template_key',
  designOptions: 'design_options',
  canvasLayoutJson: 'canvas_layout_json',
  useCanvasLayout: 'use_canvas_layout',
  isPublished: 'is_published',
  isPublic: 'is_public',
  publicToken: 'public_token',
  publishedAt: 'published_at',
};

/**
 * Result of building a partial update query.
 */
export interface PartialUpdateResult {
  /** The SET clause (e.g., "title = $1, description = $2") */
  setClause: string;
  /** The parameter values in order */
  values: QueryParam[];
  /** The next available parameter index (for WHERE clause) */
  nextParamIndex: number;
  /** Whether any fields were added */
  hasUpdates: boolean;
}

/**
 * Options for building a partial update query.
 */
export interface PartialUpdateOptions {
  /** Starting parameter index (default: 1) */
  startIndex?: number;
  /** Custom field mappings (camelCase to snake_case) */
  fieldMappings?: Record<string, string>;
  /** Fields to skip even if present in updates */
  skipFields?: string[];
  /** Extra SET clauses to add (e.g., "updated_at = NOW()") */
  extraClauses?: string[];
}

/**
 * Builds a partial UPDATE query's SET clause from an updates object.
 *
 * Converts camelCase keys to snake_case column names and handles
 * parameter indexing automatically.
 *
 * @param updates - Object with fields to update (undefined values are skipped)
 * @param options - Optional configuration
 * @returns PartialUpdateResult with setClause, values, and nextParamIndex
 *
 * @example
 * ```typescript
 * const { id, ...updateData } = input;
 * const { setClause, values, nextParamIndex, hasUpdates } = buildPartialUpdate(updateData);
 *
 * if (!hasUpdates) {
 *   throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
 * }
 *
 * values.push(id);
 * const result = await queryWithTenant(
 *   tenantId,
 *   `UPDATE prayer_request SET ${setClause} WHERE id = $${nextParamIndex} AND deleted_at IS NULL RETURNING id`,
 *   values
 * );
 * ```
 */
export function buildPartialUpdate(
  updates: Record<string, unknown>,
  options: PartialUpdateOptions = {}
): PartialUpdateResult {
  const {
    startIndex = 1,
    fieldMappings = {},
    skipFields = [],
    extraClauses = [],
  } = options;

  const allMappings = { ...DEFAULT_FIELD_MAPPINGS, ...fieldMappings };
  const setClauses: string[] = [];
  const values: QueryParam[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(updates)) {
    // Skip undefined values and explicitly skipped fields
    if (value === undefined || skipFields.includes(key)) {
      continue;
    }

    // Convert camelCase key to snake_case column name
    const columnName = allMappings[key] || camelToSnake(key);

    setClauses.push(`${columnName} = $${paramIndex}`);
    values.push(value as QueryParam);
    paramIndex++;
  }

  // Add any extra clauses (like "updated_at = NOW()")
  for (const clause of extraClauses) {
    setClauses.push(clause);
  }

  return {
    setClause: setClauses.join(', '),
    values,
    nextParamIndex: paramIndex,
    hasUpdates: setClauses.length > 0,
  };
}

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

/**
 * Result of building a WHERE clause with filters.
 */
export interface WhereClauseResult {
  /** The WHERE conditions (e.g., "status = $1 AND visibility = $2") */
  whereClause: string;
  /** The parameter values in order */
  values: QueryParam[];
  /** The next available parameter index */
  nextParamIndex: number;
  /** Whether any conditions were added */
  hasConditions: boolean;
}

/**
 * Options for building a WHERE clause.
 */
export interface WhereClauseOptions {
  /** Starting parameter index (default: 1) */
  startIndex?: number;
  /** Custom field mappings (camelCase to snake_case) */
  fieldMappings?: Record<string, string>;
  /** Table alias prefix (e.g., "pr." for "pr.status = $1") */
  tableAlias?: string;
  /** Base conditions to always include (e.g., "deleted_at IS NULL") */
  baseConditions?: string[];
}

/**
 * Builds a WHERE clause from a filters object.
 *
 * Converts camelCase keys to snake_case column names and handles
 * parameter indexing automatically.
 *
 * @param filters - Object with filter conditions (undefined values are skipped)
 * @param options - Optional configuration
 * @returns WhereClauseResult with whereClause, values, and nextParamIndex
 *
 * @example
 * ```typescript
 * const { whereClause, values, nextParamIndex } = buildWhereClause(
 *   { status, visibility, personId, isUrgent },
 *   { tableAlias: 'pr.', baseConditions: ['pr.deleted_at IS NULL'] }
 * );
 *
 * const queryText = `SELECT * FROM prayer_request pr WHERE ${whereClause}`;
 * values.push(limit, offset);
 * queryText += ` LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`;
 * ```
 */
export function buildWhereClause(
  filters: Record<string, unknown>,
  options: WhereClauseOptions = {}
): WhereClauseResult {
  const {
    startIndex = 1,
    fieldMappings = {},
    tableAlias = '',
    baseConditions = [],
  } = options;

  const allMappings = { ...DEFAULT_FIELD_MAPPINGS, ...fieldMappings };
  const conditions: string[] = [...baseConditions];
  const values: QueryParam[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(filters)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    // Convert camelCase key to snake_case column name
    const columnName = allMappings[key] || camelToSnake(key);

    conditions.push(`${tableAlias}${columnName} = $${paramIndex}`);
    values.push(value as QueryParam);
    paramIndex++;
  }

  return {
    whereClause: conditions.join(' AND '),
    values,
    nextParamIndex: paramIndex,
    hasConditions: conditions.length > 0,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts a camelCase string to snake_case.
 *
 * @param str - The camelCase string to convert
 * @returns The snake_case equivalent
 *
 * @example
 * camelToSnake('isUrgent') // => 'is_urgent'
 * camelToSnake('personId') // => 'person_id'
 */
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Converts a snake_case string to camelCase.
 *
 * @param str - The snake_case string to convert
 * @returns The camelCase equivalent
 *
 * @example
 * snakeToCamel('is_urgent') // => 'isUrgent'
 * snakeToCamel('person_id') // => 'personId'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

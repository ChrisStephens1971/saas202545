/**
 * Query Builder Tests (Phase 2B)
 *
 * Tests the query building functions in queryBuilders.ts.
 * Uses node environment - tests pure functions without DOM.
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildPartialUpdate,
  buildWhereClause,
  camelToSnake,
  snakeToCamel,
} from '../queryBuilders';

// ============================================================================
// CASE CONVERSION TESTS
// ============================================================================

describe('camelToSnake', () => {
  it('converts simple camelCase to snake_case', () => {
    expect(camelToSnake('isUrgent')).toBe('is_urgent');
    expect(camelToSnake('personId')).toBe('person_id');
    expect(camelToSnake('createdAt')).toBe('created_at');
  });

  it('handles multiple uppercase letters', () => {
    expect(camelToSnake('pdfLargePrintUrl')).toBe('pdf_large_print_url');
    expect(camelToSnake('canvasLayoutJson')).toBe('canvas_layout_json');
  });

  it('handles already lowercase strings', () => {
    expect(camelToSnake('status')).toBe('status');
    expect(camelToSnake('title')).toBe('title');
  });

  it('handles empty string', () => {
    expect(camelToSnake('')).toBe('');
  });
});

describe('snakeToCamel', () => {
  it('converts simple snake_case to camelCase', () => {
    expect(snakeToCamel('is_urgent')).toBe('isUrgent');
    expect(snakeToCamel('person_id')).toBe('personId');
    expect(snakeToCamel('created_at')).toBe('createdAt');
  });

  it('handles multiple underscores', () => {
    expect(snakeToCamel('pdf_large_print_url')).toBe('pdfLargePrintUrl');
    expect(snakeToCamel('canvas_layout_json')).toBe('canvasLayoutJson');
  });

  it('handles already camelCase strings', () => {
    expect(snakeToCamel('status')).toBe('status');
    expect(snakeToCamel('title')).toBe('title');
  });

  it('handles empty string', () => {
    expect(snakeToCamel('')).toBe('');
  });
});

// ============================================================================
// PARTIAL UPDATE TESTS
// ============================================================================

describe('buildPartialUpdate', () => {
  it('builds SET clause from updates object', () => {
    const result = buildPartialUpdate({
      title: 'New Title',
      description: 'New Description',
    });

    expect(result.setClause).toBe('title = $1, description = $2');
    expect(result.values).toEqual(['New Title', 'New Description']);
    expect(result.nextParamIndex).toBe(3);
    expect(result.hasUpdates).toBe(true);
  });

  it('converts camelCase keys to snake_case columns', () => {
    const result = buildPartialUpdate({
      isUrgent: true,
      personId: 'uuid-123',
    });

    expect(result.setClause).toBe('is_urgent = $1, person_id = $2');
    expect(result.values).toEqual([true, 'uuid-123']);
  });

  it('skips undefined values', () => {
    const result = buildPartialUpdate({
      title: 'New Title',
      description: undefined,
      status: 'active',
    });

    expect(result.setClause).toBe('title = $1, status = $2');
    expect(result.values).toEqual(['New Title', 'active']);
    expect(result.nextParamIndex).toBe(3);
  });

  it('handles custom start index', () => {
    const result = buildPartialUpdate(
      { title: 'New Title' },
      { startIndex: 3 }
    );

    expect(result.setClause).toBe('title = $3');
    expect(result.values).toEqual(['New Title']);
    expect(result.nextParamIndex).toBe(4);
  });

  it('handles custom field mappings', () => {
    const result = buildPartialUpdate(
      { customField: 'value' },
      { fieldMappings: { customField: 'custom_column_name' } }
    );

    expect(result.setClause).toBe('custom_column_name = $1');
  });

  it('skips fields in skipFields option', () => {
    const result = buildPartialUpdate(
      { title: 'New Title', id: 'should-skip' },
      { skipFields: ['id'] }
    );

    expect(result.setClause).toBe('title = $1');
    expect(result.values).toEqual(['New Title']);
  });

  it('includes extra clauses', () => {
    const result = buildPartialUpdate(
      { title: 'New Title' },
      { extraClauses: ['updated_at = NOW()', 'answered_at = NOW()'] }
    );

    expect(result.setClause).toBe('title = $1, updated_at = NOW(), answered_at = NOW()');
    expect(result.values).toEqual(['New Title']);
  });

  it('returns hasUpdates false for empty updates', () => {
    const result = buildPartialUpdate({});

    expect(result.setClause).toBe('');
    expect(result.values).toEqual([]);
    expect(result.hasUpdates).toBe(false);
  });

  it('returns hasUpdates true for extraClauses only', () => {
    const result = buildPartialUpdate({}, { extraClauses: ['updated_at = NOW()'] });

    expect(result.setClause).toBe('updated_at = NOW()');
    expect(result.values).toEqual([]);
    expect(result.hasUpdates).toBe(true);
  });

  it('handles null values', () => {
    const result = buildPartialUpdate({
      title: 'New Title',
      description: null,
    });

    expect(result.setClause).toBe('title = $1, description = $2');
    expect(result.values).toEqual(['New Title', null]);
  });

  it('handles boolean values', () => {
    const result = buildPartialUpdate({
      isUrgent: false,
      isPublic: true,
    });

    expect(result.values).toEqual([false, true]);
  });

  it('handles number values', () => {
    const result = buildPartialUpdate({
      orderIndex: 5,
      durationMinutes: 30,
    });

    expect(result.values).toEqual([5, 30]);
  });
});

// ============================================================================
// WHERE CLAUSE TESTS
// ============================================================================

describe('buildWhereClause', () => {
  it('builds WHERE clause from filters object', () => {
    const result = buildWhereClause({
      status: 'active',
      visibility: 'public',
    });

    expect(result.whereClause).toBe('status = $1 AND visibility = $2');
    expect(result.values).toEqual(['active', 'public']);
    expect(result.nextParamIndex).toBe(3);
    expect(result.hasConditions).toBe(true);
  });

  it('converts camelCase keys to snake_case columns', () => {
    const result = buildWhereClause({
      isUrgent: true,
      personId: 'uuid-123',
    });

    expect(result.whereClause).toBe('is_urgent = $1 AND person_id = $2');
  });

  it('skips undefined values', () => {
    const result = buildWhereClause({
      status: 'active',
      visibility: undefined,
      personId: 'uuid-123',
    });

    expect(result.whereClause).toBe('status = $1 AND person_id = $2');
    expect(result.values).toEqual(['active', 'uuid-123']);
  });

  it('includes base conditions', () => {
    const result = buildWhereClause(
      { status: 'active' },
      { baseConditions: ['deleted_at IS NULL'] }
    );

    expect(result.whereClause).toBe('deleted_at IS NULL AND status = $1');
    expect(result.values).toEqual(['active']);
  });

  it('includes table alias', () => {
    const result = buildWhereClause(
      { status: 'active', isUrgent: true },
      { tableAlias: 'pr.' }
    );

    expect(result.whereClause).toBe('pr.status = $1 AND pr.is_urgent = $2');
  });

  it('handles custom start index', () => {
    const result = buildWhereClause(
      { status: 'active' },
      { startIndex: 5 }
    );

    expect(result.whereClause).toBe('status = $5');
    expect(result.nextParamIndex).toBe(6);
  });

  it('handles custom field mappings', () => {
    const result = buildWhereClause(
      { customFilter: 'value' },
      { fieldMappings: { customFilter: 'custom_column' } }
    );

    expect(result.whereClause).toBe('custom_column = $1');
  });

  it('returns hasConditions false for empty filters', () => {
    const result = buildWhereClause({});

    expect(result.whereClause).toBe('');
    expect(result.hasConditions).toBe(false);
  });

  it('returns hasConditions true for base conditions only', () => {
    const result = buildWhereClause({}, { baseConditions: ['deleted_at IS NULL'] });

    expect(result.whereClause).toBe('deleted_at IS NULL');
    expect(result.hasConditions).toBe(true);
  });

  it('combines base conditions and filters', () => {
    const result = buildWhereClause(
      { status: 'active', visibility: 'public' },
      {
        baseConditions: ['deleted_at IS NULL', 'tenant_id = $tenant'],
        tableAlias: 'pr.',
      }
    );

    expect(result.whereClause).toBe(
      'deleted_at IS NULL AND tenant_id = $tenant AND pr.status = $1 AND pr.visibility = $2'
    );
  });
});

// ============================================================================
// INTEGRATION-STYLE TESTS
// ============================================================================

describe('Query Builder Integration', () => {
  it('builds a complete UPDATE query', () => {
    const updateData = {
      title: 'Updated Prayer',
      description: 'New description',
      isUrgent: true,
    };
    const id = 'prayer-123';

    const { setClause, values, nextParamIndex } = buildPartialUpdate(updateData);

    values.push(id);
    const query = `UPDATE prayer_request SET ${setClause} WHERE id = $${nextParamIndex} RETURNING id`;

    expect(query).toBe(
      'UPDATE prayer_request SET title = $1, description = $2, is_urgent = $3 WHERE id = $4 RETURNING id'
    );
    expect(values).toEqual(['Updated Prayer', 'New description', true, 'prayer-123']);
  });

  it('builds a complete SELECT query with filters', () => {
    const filters = {
      status: 'active',
      visibility: 'public',
      isUrgent: true,
    };
    const limit = 50;
    const offset = 0;

    const { whereClause, values, nextParamIndex } = buildWhereClause(filters, {
      tableAlias: 'pr.',
      baseConditions: ['pr.deleted_at IS NULL'],
    });

    values.push(limit, offset);
    const query = `SELECT * FROM prayer_request pr WHERE ${whereClause} LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`;

    expect(query).toBe(
      'SELECT * FROM prayer_request pr WHERE pr.deleted_at IS NULL AND pr.status = $1 AND pr.visibility = $2 AND pr.is_urgent = $3 LIMIT $4 OFFSET $5'
    );
    expect(values).toEqual(['active', 'public', true, 50, 0]);
  });

  it('handles prayers router update pattern with answered_at', () => {
    const updateData = {
      title: 'Answered Prayer',
      status: 'answered',
    };

    const extraClauses: string[] = [];
    if (updateData.status === 'answered') {
      extraClauses.push('answered_at = NOW()');
    }

    const { setClause, values, nextParamIndex } = buildPartialUpdate(updateData, {
      extraClauses,
    });

    values.push('prayer-id');
    const query = `UPDATE prayer_request SET ${setClause} WHERE id = $${nextParamIndex} RETURNING id`;

    expect(query).toBe(
      'UPDATE prayer_request SET title = $1, status = $2, answered_at = NOW() WHERE id = $3 RETURNING id'
    );
    expect(values).toEqual(['Answered Prayer', 'answered', 'prayer-id']);
  });
});

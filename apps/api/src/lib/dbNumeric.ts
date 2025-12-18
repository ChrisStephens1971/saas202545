/**
 * Database Numeric Helpers
 *
 * PostgreSQL returns numeric aggregates (COUNT, SUM, etc.) as strings or bigint
 * because JavaScript's Number cannot safely represent all int8/bigint values.
 *
 * These helpers ensure safe conversion to JavaScript numbers for tRPC responses.
 *
 * IMPORTANT: Always use these helpers when returning aggregate values through tRPC.
 * Returning raw PostgreSQL results can cause TransformResultError on the client.
 *
 * @see docs/backend/SERIALIZATION-RULES.md
 */

/**
 * Safely converts a PostgreSQL COUNT/aggregate value to a JavaScript number.
 *
 * PostgreSQL's pg driver returns:
 * - COUNT(*) as string (because bigint can exceed Number.MAX_SAFE_INTEGER)
 * - SUM() as string for bigint/numeric types
 * - Native BigInt if pg-types is configured (rare)
 *
 * This function handles all these cases safely.
 *
 * @param value - The value from PostgreSQL (string, number, bigint, null, undefined)
 * @returns A JavaScript number (0 for invalid/null/undefined values)
 *
 * @example
 * ```typescript
 * // In a tRPC procedure:
 * const result = await queryWithTenant(tenantId, 'SELECT COUNT(*) as total FROM users', []);
 * return {
 *   total: pgCountToNumber(result.rows[0].total), // Safe!
 * };
 * ```
 */
export function pgCountToNumber(value: unknown): number {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 0;
  }

  // Handle native BigInt (rare, but possible with pg-types config)
  if (typeof value === 'bigint') {
    // Check if value is within safe integer range
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      // Log warning but still convert (truncation may occur)
      console.warn(
        `[dbNumeric] BigInt value ${value} exceeds safe integer range. Precision may be lost.`
      );
    }
    return Number(value);
  }

  // Handle number (already correct type)
  if (typeof value === 'number') {
    // Check for NaN
    if (Number.isNaN(value)) {
      return 0;
    }
    return value;
  }

  // Handle string (most common case from pg driver)
  if (typeof value === 'string') {
    // Handle empty string
    if (value.trim() === '') {
      return 0;
    }

    const parsed = parseInt(value, 10);

    // Check for NaN from failed parse
    if (Number.isNaN(parsed)) {
      return 0;
    }

    return parsed;
  }

  // Any other type - return 0
  return 0;
}

/**
 * Safely converts a PostgreSQL SUM/AVG value to a JavaScript number.
 * Similar to pgCountToNumber but uses parseFloat for decimal values.
 *
 * @param value - The value from PostgreSQL
 * @returns A JavaScript number (0 for invalid/null/undefined values)
 *
 * @example
 * ```typescript
 * const result = await queryWithTenant(tenantId, 'SELECT AVG(amount) as avg FROM donations', []);
 * return {
 *   average: pgDecimalToNumber(result.rows[0].avg),
 * };
 * ```
 */
export function pgDecimalToNumber(value: unknown): number {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 0;
  }

  // Handle native BigInt
  if (typeof value === 'bigint') {
    return Number(value);
  }

  // Handle number
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return 0;
    }
    return value;
  }

  // Handle string
  if (typeof value === 'string') {
    if (value.trim() === '') {
      return 0;
    }

    const parsed = parseFloat(value);

    if (Number.isNaN(parsed)) {
      return 0;
    }

    return parsed;
  }

  return 0;
}

/**
 * Type guard to check if a value can be safely converted to a number.
 * Useful for conditional logic before conversion.
 *
 * @param value - Any value to check
 * @returns true if the value can be converted to a valid number
 */
export function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }

  if (typeof value === 'bigint') {
    return true;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return false;
    }
    return !Number.isNaN(parseFloat(trimmed));
  }

  return false;
}

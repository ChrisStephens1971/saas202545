# Backend Serialization Rules

This document defines the rules for handling PostgreSQL data types when returning data through tRPC endpoints. Following these rules prevents `TransformResultError` and ensures consistent data types across the API.

## The Problem

PostgreSQL aggregate functions return values that don't serialize correctly through tRPC with superjson:

| PostgreSQL | pg Driver Returns | Problem |
|------------|-------------------|---------|
| `COUNT(*)` | `string` (e.g., `"157"`) | Not a number |
| `SUM(numeric)` | `string` (e.g., `"12345.67"`) | Not a number |
| `AVG(...)` | `string` | Not a number |
| `BIGINT` | `bigint` | Exceeds `Number.MAX_SAFE_INTEGER`, superjson can't handle |

When tRPC attempts to serialize these values, it throws:

```
TransformResultError: Unable to serialize tRPC result
```

## The Solution

Use the standardized helpers in `apps/api/src/lib/dbNumeric.ts`:

```typescript
import { pgCountToNumber, pgDecimalToNumber } from '../lib/dbNumeric';
```

### `pgCountToNumber(value)`

Use for **COUNT(*)** and integer aggregates:

```typescript
// Database query returns string
const result = await queryWithTenant<{ total: string }>(
  tenantId,
  'SELECT COUNT(*) as total FROM person WHERE deleted_at IS NULL',
  []
);

// Convert before returning
return {
  total: pgCountToNumber(result.rows[0]?.total), // Returns number
};
```

### `pgDecimalToNumber(value)`

Use for **SUM()**, **AVG()**, and decimal values:

```typescript
const result = await queryWithTenant<{ total_amount: string }>(
  tenantId,
  'SELECT SUM(amount) as total_amount FROM contribution',
  []
);

return {
  totalAmount: pgDecimalToNumber(result.rows[0]?.total_amount),
};
```

## Input Handling

Both helpers safely handle all input types:

| Input | `pgCountToNumber` | `pgDecimalToNumber` |
|-------|-------------------|---------------------|
| `"42"` | `42` | `42` |
| `"42.5"` | `42` (truncated) | `42.5` |
| `42` | `42` | `42` |
| `BigInt(42)` | `42` | `42` |
| `null` | `0` | `0` |
| `undefined` | `0` | `0` |
| `""` | `0` | `0` |
| `"abc"` | `0` | `0` |
| `NaN` | `0` | `0` |

## Rules

### Rule 1: Never Return Raw Database Rows

```typescript
// BAD - Returns raw pg types
return result.rows;

// GOOD - Map to explicit DTO
return result.rows.map(row => ({
  id: row.id,
  name: row.name,
  count: pgCountToNumber(row.count),
}));
```

### Rule 2: Always Convert Aggregates

```typescript
// BAD
total: result.rows[0]?.total,

// GOOD
total: pgCountToNumber(result.rows[0]?.total),
```

### Rule 3: Use Correct Helper for Data Type

```typescript
// Integer counts
itemCount: pgCountToNumber(row.item_count),
totalRecords: pgCountToNumber(row.total),

// Decimal values
averageScore: pgDecimalToNumber(row.avg_score),
totalAmount: pgDecimalToNumber(row.sum_amount),
```

### Rule 4: Handle Optional Chaining

The helpers safely handle undefined from optional chaining:

```typescript
// Safe - returns 0 if rows is empty
pgCountToNumber(result.rows[0]?.total)
```

### Rule 5: No Need for Fallback Values

```typescript
// UNNECESSARY
pgCountToNumber(row.count || '0')

// SUFFICIENT
pgCountToNumber(row.count)
```

## Type Annotations for Queries

Always type your query results to document the pg driver's return types:

```typescript
// Document that COUNT returns string
const result = await queryWithTenant<{
  id: string;
  name: string;
  member_count: string;  // COUNT(*) returns string
}>(tenantId, query, params);

// Or for inline types
interface GroupWithCount {
  id: string;
  name: string;
  member_count: string;  // Explicitly string, not number
}
```

## Common Patterns

### Pagination with Total Count

```typescript
const [dataResult, countResult] = await Promise.all([
  queryWithTenant<Person>(tenantId, dataQuery, dataParams),
  queryWithTenant<{ total: string }>(tenantId, countQuery, countParams),
]);

return {
  items: dataResult.rows.map(transformPerson),
  total: pgCountToNumber(countResult.rows[0]?.total),
  page,
  pageSize,
};
```

### Aggregations in Analytics

```typescript
const result = await queryWithTenant<{
  sessions_count: string;
  avg_duration: string;
  total_items: string;
}>(tenantId, analyticsQuery, []);

return result.rows.map(row => ({
  sessionsCount: pgCountToNumber(row.sessions_count),
  avgDuration: pgDecimalToNumber(row.avg_duration),
  totalItems: pgCountToNumber(row.total_items),
}));
```

### Conditional Aggregates

```typescript
const result = await queryWithTenant<{
  total_actual_seconds: string | null;  // SUM can return null
}>(tenantId, query, []);

return {
  totalActualSeconds: result.rows[0]?.total_actual_seconds
    ? pgDecimalToNumber(result.rows[0].total_actual_seconds)
    : null,
};
```

### Reference Counting Before Delete

```typescript
const referencesCheck = await queryWithTenant<{ count: string }>(
  tenantId,
  'SELECT COUNT(*) as count FROM service_item WHERE song_id = $1',
  [id]
);

const referenceCount = pgCountToNumber(referencesCheck.rows[0]?.count);

if (referenceCount > 0) {
  // Handle references
}
```

## Validation Helper

Use `isNumericValue()` to check if a value can be safely converted:

```typescript
import { isNumericValue } from '../lib/dbNumeric';

if (isNumericValue(input)) {
  // Safe to convert
  const num = pgCountToNumber(input);
}
```

## Testing

Tests for the helpers are in `apps/api/src/lib/__tests__/dbNumeric.test.ts`.

Run tests:

```bash
cd apps/api
npm test -- dbNumeric
```

## Routers Using These Helpers

The following routers have been audited and use the standard helpers:

- `analytics.ts` - Session counts, averages, totals
- `attendance.ts` - Attendance counts
- `bulletins.ts` - Item counts, CCLI validation counts
- `communications.ts` - Message counts
- `directory.ts` - Member counts per group
- `donations.ts` - Contribution totals
- `events.ts` - RSVP counts
- `forms.ts` - Submission counts
- `groups.ts` - Member counts
- `people.ts` - Person counts
- `preach.ts` - Session timing aggregates
- `prayers.ts` - Prayer request counts
- `sermons.ts` - Sermon counts
- `serviceItems.ts` - Item counts
- `songs.ts` - Reference counts
- `thankYouNotes.ts` - Note counts

## When Adding New Routers

1. Import the helpers:
   ```typescript
   import { pgCountToNumber, pgDecimalToNumber } from '../lib/dbNumeric';
   ```

2. Type query results with explicit string types for aggregates

3. Convert all COUNT/SUM/AVG results before returning

4. Never return `result.rows` directly - always map to DTOs

5. Run the serialization check:
   ```bash
   grep -r "parseInt.*rows" apps/api/src/routers/
   # Should return no results
   ```

## Related Documentation

- [tRPC Documentation](https://trpc.io/docs)
- [superjson](https://github.com/blitz-js/superjson)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)

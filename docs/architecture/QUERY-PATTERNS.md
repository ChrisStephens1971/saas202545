# Query Building Patterns

This document describes the query builder utilities in `apps/api/src/lib/queryBuilders.ts`, introduced in Phase 2B to eliminate brittle manual SQL parameter indexing.

---

## Overview

Building dynamic SQL queries with parameterized values is error-prone when done manually. Consider this common anti-pattern:

```typescript
// ❌ Anti-pattern: Manual parameter indexing
let queryText = 'UPDATE prayer_request SET ';
const params = [];
let idx = 1;

if (title !== undefined) {
  queryText += `title = $${idx++}, `;
  params.push(title);
}
if (status !== undefined) {
  queryText += `status = $${idx++}, `;
  params.push(status);
}
// ... more fields, easy to get wrong
```

The query builder utilities eliminate this error-prone approach.

---

## Core Utilities

### `buildPartialUpdate`

Builds the SET clause for UPDATE statements from a JavaScript object.

**Signature:**
```typescript
function buildPartialUpdate(
  updates: Record<string, unknown>,
  options?: PartialUpdateOptions
): PartialUpdateResult;
```

**Returns:**
```typescript
interface PartialUpdateResult {
  setClause: string;      // e.g., "title = $1, status = $2"
  values: QueryParam[];   // Parameter values in order
  nextParamIndex: number; // Next available $N index
  hasUpdates: boolean;    // True if any fields were added
}
```

**Basic Usage:**
```typescript
const { id, ...updateData } = input;
const { setClause, values, nextParamIndex, hasUpdates } = buildPartialUpdate(updateData);

if (!hasUpdates) {
  throw noFieldsToUpdate();
}

values.push(id);
const result = await queryWithTenant(
  tenantId,
  `UPDATE prayer_request SET ${setClause} WHERE id = $${nextParamIndex} RETURNING id`,
  values
);
```

**With Extra Clauses (e.g., timestamps):**
```typescript
const extraClauses: string[] = [];
if (updateData.status === 'answered') {
  extraClauses.push('answered_at = NOW()');
}

const { setClause, values, nextParamIndex } = buildPartialUpdate(updateData, {
  extraClauses,
});
```

---

### `buildWhereClause`

Builds WHERE conditions from a filters object.

**Signature:**
```typescript
function buildWhereClause(
  filters: Record<string, unknown>,
  options?: WhereClauseOptions
): WhereClauseResult;
```

**Returns:**
```typescript
interface WhereClauseResult {
  whereClause: string;    // e.g., "status = $1 AND visibility = $2"
  values: QueryParam[];   // Parameter values in order
  nextParamIndex: number; // Next available $N index
  hasConditions: boolean; // True if any conditions exist
}
```

**Basic Usage:**
```typescript
const { whereClause, values, nextParamIndex } = buildWhereClause(
  { status, visibility, personId, isUrgent },
  { baseConditions: ['deleted_at IS NULL'] }
);

const countQuery = `SELECT COUNT(*) as total FROM prayer_request WHERE ${whereClause}`;
```

**With Table Alias:**
```typescript
const { whereClause, values } = buildWhereClause(
  { status, visibility },
  {
    tableAlias: 'pr.',
    baseConditions: ['pr.deleted_at IS NULL'],
  }
);
// Result: "pr.deleted_at IS NULL AND pr.status = $1 AND pr.visibility = $2"
```

---

## Case Conversion

The utilities automatically convert between JavaScript camelCase and PostgreSQL snake_case.

### Built-in Mappings

Common field mappings are predefined:

| camelCase | snake_case |
|-----------|------------|
| `personId` | `person_id` |
| `tenantId` | `tenant_id` |
| `createdAt` | `created_at` |
| `isUrgent` | `is_urgent` |
| `issueDate` | `issue_date` |
| `brandPackId` | `brand_pack_id` |
| ... | ... |

### Helper Functions

```typescript
camelToSnake('isUrgent')  // => 'is_urgent'
snakeToCamel('is_urgent') // => 'isUrgent'
```

### Custom Mappings

Override or extend mappings via options:

```typescript
const result = buildPartialUpdate(updates, {
  fieldMappings: { customField: 'custom_column_name' },
});
```

---

## Options Reference

### PartialUpdateOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startIndex` | `number` | `1` | Starting parameter index ($N) |
| `fieldMappings` | `Record<string, string>` | `{}` | Custom camelCase → snake_case mappings |
| `skipFields` | `string[]` | `[]` | Fields to skip even if present |
| `extraClauses` | `string[]` | `[]` | Additional SET clauses (e.g., `'updated_at = NOW()'`) |

### WhereClauseOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startIndex` | `number` | `1` | Starting parameter index ($N) |
| `fieldMappings` | `Record<string, string>` | `{}` | Custom camelCase → snake_case mappings |
| `tableAlias` | `string` | `''` | Table alias prefix (e.g., `'pr.'`) |
| `baseConditions` | `string[]` | `[]` | Conditions always included (e.g., `'deleted_at IS NULL'`) |

---

## Best Practices

### 1. Always Check `hasUpdates`

```typescript
const { hasUpdates } = buildPartialUpdate(updateData);
if (!hasUpdates) {
  throw noFieldsToUpdate(); // Use error factory
}
```

### 2. Use `extraClauses` for Computed Values

```typescript
const extraClauses: string[] = ['updated_at = NOW()'];
if (updateData.status === 'answered') {
  extraClauses.push('answered_at = NOW()');
}
```

### 3. Chain Parameter Indices Correctly

When combining multiple query builders:

```typescript
const { whereClause, values, nextParamIndex } = buildWhereClause(filters);
values.push(limit, offset);
queryText += ` LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`;
```

### 4. Prefer Built-in Mappings

Add common fields to `DEFAULT_FIELD_MAPPINGS` in `queryBuilders.ts` rather than passing custom mappings everywhere.

---

## Testing

Tests are located in `apps/api/src/lib/__tests__/queryBuilders.test.ts`:

```bash
npm test -- queryBuilders.test.ts
```

Test coverage includes:
- Case conversion (camelToSnake, snakeToCamel)
- Partial update building with all option combinations
- WHERE clause building with table aliases and base conditions
- Integration tests combining both utilities

---

## Related Documentation

- [Error Handling](./ERROR-HANDLING.md) - Error factory utilities
- [Mappers](./MAPPERS.md) - Row-to-DTO mapping utilities

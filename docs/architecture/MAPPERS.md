# Row-to-DTO Mapping Patterns

This document describes the mapper utilities in `apps/api/src/lib/mappers.ts`, introduced in Phase 2A to provide consistent, type-safe conversion between PostgreSQL rows and API DTOs.

---

## Overview

PostgreSQL returns rows with snake_case column names, but our tRPC API uses camelCase properties. Mappers provide:

1. **Type safety** - Catch mismatches at compile time
2. **Consistency** - Same transformation everywhere
3. **Maintainability** - Single source of truth for field mappings
4. **API stability** - Decouple DB schema from API contracts

```typescript
// ❌ Anti-pattern: Inline mapping
return {
  id: row.id,
  tenantId: row.tenant_id,  // Easy to forget fields
  serviceDate: row.issue_date,
  // ... 20 more fields
};

// ✅ Preferred: Typed mapper
return mapBulletinToListItem(row);
```

---

## Architecture

### Three-Layer Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Database Layer                                              │
│  snake_case columns: issue_date, tenant_id, brand_pack_id   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Row Interface (BulletinIssueRow)                           │
│  TypeScript type matching DB schema exactly                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Mapper Function
┌─────────────────────────────────────────────────────────────┐
│  DTO Interface (BulletinListItemDTO)                        │
│  camelCase, may rename/omit fields                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Layer (tRPC Response)                                  │
│  Clean camelCase JSON for clients                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### Row Interfaces

Row interfaces match the database schema exactly, using snake_case:

```typescript
export interface BulletinIssueRow {
  id: string;
  tenant_id: string;
  issue_date: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brand_pack_id: string | null;
  pdf_url: string | null;
  // ... all columns from bulletin_issue table
}
```

### DTO Interfaces

DTOs define the API contract, using camelCase:

```typescript
export interface BulletinListItemDTO {
  id: string;
  tenantId: string;
  serviceDate: Date;  // Note: renamed from issue_date
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brandPackId: string | null;
  pdfUrl: string | null;
  // ... only fields needed for list view
}
```

### Mapper Functions

Mappers convert rows to DTOs with explicit field mapping:

```typescript
export function mapBulletinToListItem(row: BulletinIssueRow): BulletinListItemDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceDate: row.issue_date,  // Semantic rename
    status: row.status,
    brandPackId: row.brand_pack_id,
    pdfUrl: row.pdf_url,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
```

---

## Available Mappers

### Bulletin Mappers

| Mapper | Input → Output | Use Case |
|--------|---------------|----------|
| `mapBulletinToListItem` | BulletinIssueRow → BulletinListItemDTO | List views |
| `mapBulletinToDetail` | BulletinIssueRow → BulletinDetailDTO | Detail/edit views |
| `mapBulletinToPublic` | BulletinIssueRow → BulletinPublicDTO | Public token access |
| `mapBulletinToCreateResponse` | BulletinIssueRow → BulletinCreateDTO | Create response |
| `mapBulletinFromPrevious` | BulletinIssueRow → BulletinFromPreviousDTO | Copy from previous |

### Service Item Mappers

| Mapper | Input → Output | Use Case |
|--------|---------------|----------|
| `mapServiceItemToPublic` | ServiceItemRow → ServiceItemPublicDTO | Public bulletin view |

---

## Usage Patterns

### In List Queries

```typescript
list: protectedProcedure
  .input(listSchema)
  .query(async ({ input, ctx }) => {
    const result = await queryWithTenant<BulletinIssueRow>(
      ctx.tenantId!,
      queryText,
      params
    );

    return {
      bulletins: result.rows.map(mapBulletinToListItem),
      total: pgCountToNumber(countResult.rows[0].total),
    };
  }),
```

### In Get Queries

```typescript
get: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    const result = await queryWithTenant<BulletinIssueRow>(
      ctx.tenantId!,
      queryText,
      [input.id]
    );

    if (result.rows.length === 0) {
      throw bulletinNotFound(input.id);
    }

    return mapBulletinToDetail(result.rows[0]);
  }),
```

### With Related Data

```typescript
getByPublicToken: publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const bulletinResult = await query<BulletinIssueRow>(bulletinQuery, [input.token]);
    if (bulletinResult.rows.length === 0) {
      throw bulletinNotFound();
    }

    const bulletin = mapBulletinToPublic(bulletinResult.rows[0]);

    const itemsResult = await query<ServiceItemRow>(itemsQuery, [bulletin.id]);
    const serviceItems = itemsResult.rows.map(mapServiceItemToPublic);

    return {
      ...bulletin,
      serviceItems,
    };
  }),
```

---

## Design Guidelines

### 1. One Row Interface Per Table

Create a single Row interface that matches the full table schema:

```typescript
// ✅ Full table representation
export interface BulletinIssueRow {
  id: string;
  tenant_id: string;
  // ... all columns
}
```

### 2. Multiple DTOs Per Use Case

Create focused DTOs for different API endpoints:

```typescript
// List view - minimal fields
export interface BulletinListItemDTO { ... }

// Detail view - full fields
export interface BulletinDetailDTO { ... }

// Public view - exclude sensitive fields
export interface BulletinPublicDTO { ... }
```

### 3. Semantic Field Renaming

DTOs can rename fields for clarity:

```typescript
// DB column: issue_date (when bulletin was created)
// DTO field: serviceDate (the Sunday it's for)
serviceDate: row.issue_date,

// DB column: leader_name
// DTO field: speaker (more accurate for sermons)
speaker: row.leader_name,
```

### 4. Null Handling

Be explicit about nullability:

```typescript
// DB allows null, DTO allows null
pdfUrl: row.pdf_url,  // string | null

// DB allows null, DTO forces null for create response
lockedAt: null,  // Always null for new bulletins
```

---

## Adding New Mappers

### Step 1: Define Row Interface

```typescript
export interface MyTableRow {
  id: string;
  tenant_id: string;
  some_field: string;
  nullable_field: string | null;
  created_at: Date;
  updated_at: Date;
}
```

### Step 2: Define DTO Interface(s)

```typescript
export interface MyTableListDTO {
  id: string;
  tenantId: string;
  someField: string;
  createdAt: Date;
}

export interface MyTableDetailDTO {
  id: string;
  tenantId: string;
  someField: string;
  nullableField: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 3: Create Mapper Function(s)

```typescript
export function mapMyTableToList(row: MyTableRow): MyTableListDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    someField: row.some_field,
    createdAt: row.created_at,
  };
}

export function mapMyTableToDetail(row: MyTableRow): MyTableDetailDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    someField: row.some_field,
    nullableField: row.nullable_field,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

### Step 4: Add Tests

```typescript
describe('mapMyTableToList', () => {
  it('maps row to list DTO', () => {
    const row: MyTableRow = {
      id: 'test-id',
      tenant_id: 'tenant-1',
      some_field: 'value',
      nullable_field: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
    };

    const dto = mapMyTableToList(row);

    expect(dto.id).toBe('test-id');
    expect(dto.tenantId).toBe('tenant-1');
    expect(dto.someField).toBe('value');
    expect(dto.createdAt).toEqual(new Date('2024-01-01'));
    // Note: nullable_field and updated_at not in list DTO
  });
});
```

---

## Testing

Tests are located in `apps/api/src/lib/__tests__/mappers.test.ts`:

```bash
npm test -- mappers.test.ts
```

---

## Related Documentation

- [Query Patterns](./QUERY-PATTERNS.md) - Query builder utilities
- [Error Handling](./ERROR-HANDLING.md) - Error factory utilities

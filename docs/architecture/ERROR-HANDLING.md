# Error Handling Patterns

This document describes the error factory utilities in `apps/api/src/lib/errors.ts`, introduced in Phase 2C to provide consistent, type-safe error handling across all tRPC routers.

---

## Overview

Error handling in tRPC routers should be consistent and informative. The error factories eliminate repetitive boilerplate:

```typescript
// ❌ Anti-pattern: Inline error construction
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Prayer request not found',
});

// ✅ Preferred: Error factory
throw prayerNotFound();
```

---

## Common Error Factories

### `notFound(resource, details?)`

Creates a NOT_FOUND error for any resource type.

```typescript
throw notFound('Bulletin');
// => "Bulletin not found"

throw notFound('Bulletin', 'ID: abc-123');
// => "Bulletin not found: ID: abc-123"
```

### `badRequest(message)`

Creates a BAD_REQUEST error for invalid input.

```typescript
throw badRequest('No fields to update');
throw badRequest('Person ID required');
```

### `forbidden(action, resource, reason?)`

Creates a FORBIDDEN error for authorization failures.

```typescript
throw forbidden('edit', 'bulletin');
// => "Cannot edit bulletin"

throw forbidden('lock', 'bulletin', 'Already locked by another user');
// => "Cannot lock bulletin: Already locked by another user"
```

### `unauthorized(message?)`

Creates an UNAUTHORIZED error.

```typescript
throw unauthorized();
// => "Authentication required"

throw unauthorized('Session expired');
// => "Session expired"
```

### `conflict(resource, details?)`

Creates a CONFLICT error for duplicate resources.

```typescript
throw conflict('Bulletin');
// => "Bulletin already exists"

throw conflict('attendance record', 'Person already checked in to this session');
// => "attendance record conflict: Person already checked in to this session"
```

### `preconditionFailed(message)`

Creates a PRECONDITION_FAILED error for state-based failures.

```typescript
throw preconditionFailed('Bulletin is locked and cannot be edited');
```

### `internalError(message, cause?)`

Creates an INTERNAL_SERVER_ERROR for unexpected failures.

```typescript
throw internalError('Failed to generate PDF');
throw internalError('Database connection failed', originalError);
```

---

## Domain-Specific Factories

Pre-built factories for common domain resources:

| Factory | Message | Code |
|---------|---------|------|
| `bulletinNotFound(id?)` | "Bulletin not found" | NOT_FOUND |
| `bulletinLocked(action?)` | "Bulletin is locked and cannot be {action}ed" | PRECONDITION_FAILED |
| `bulletinAlreadyLocked()` | "Bulletin conflict: Already locked" | CONFLICT |
| `sermonNotFound(id?)` | "Sermon not found" | NOT_FOUND |
| `sermonPlanNotFound(sermonId?)` | "Sermon plan not found" | NOT_FOUND |
| `prayerNotFound(id?)` | "Prayer request not found" | NOT_FOUND |
| `attendanceSessionNotFound(id?)` | "Attendance session not found" | NOT_FOUND |
| `attendanceRecordNotFound()` | "Attendance record not found" | NOT_FOUND |
| `alreadyCheckedIn()` | "Person already checked in to this session" | CONFLICT |
| `groupNotFound(id?)` | "Group not found" | NOT_FOUND |
| `eventNotFound(id?)` | "Event not found" | NOT_FOUND |
| `formNotFound(id?)` | "Form not found" | NOT_FOUND |
| `formFieldNotFound(id?)` | "Field not found" | NOT_FOUND |
| `announcementNotFound(id?)` | "Announcement not found" | NOT_FOUND |
| `personNotFound(id?)` | "Person not found" | NOT_FOUND |
| `templateNotFound(id?)` | "Template not found" | NOT_FOUND |
| `campaignNotFound(id?)` | "Campaign not found" | NOT_FOUND |
| `donationNotFound(id?)` | "Donation not found" | NOT_FOUND |

---

## Validation Error Factories

For input validation failures:

```typescript
// Empty update requests
throw noFieldsToUpdate();
// => "No fields to update"

// Missing required fields
throw fieldRequired('email');
// => "email is required"

// Invalid field values
throw invalidField('email');
// => "Invalid email"

throw invalidField('email', 'Must be a valid email address');
// => "Invalid email: Must be a valid email address"
```

---

## AI-Related Error Factories

For AI feature boundaries:

```typescript
// AI not configured
throw aiNotConfigured();
// => "AI features are not configured. Please configure AI in Settings."

// Quota exceeded
throw aiQuotaExceeded();
// => "Monthly AI usage limit reached."

// Restricted content
throw restrictedContent();
// => "Draft generation is disabled for sermons containing restricted topics. Please handle this content personally."

throw restrictedContent('sermon');
// => "Draft generation is disabled for sermons containing restricted topics. Please handle this sermon personally."
```

---

## Type Guards and Utilities

### `isTRPCError(error)`

Type guard to check if an error is a TRPCError.

```typescript
try {
  // ...
} catch (error) {
  if (isTRPCError(error)) {
    console.log(error.code); // TypeScript knows this exists
  }
}
```

### `hasErrorCode(error, code)`

Check if an error has a specific tRPC code.

```typescript
if (hasErrorCode(error, 'NOT_FOUND')) {
  // Handle not found case
}
```

### `isUniqueViolation(error)`

Check if a PostgreSQL error is a unique constraint violation (code 23505).

```typescript
try {
  await queryWithTenant(tenantId, insertQuery, values);
} catch (error) {
  if (isUniqueViolation(error)) {
    throw conflict('Bulletin', 'Already exists for this date');
  }
  throw error;
}
```

### `handleUniqueViolation(error, resource, details?)`

Utility to convert unique violations to CONFLICT errors.

```typescript
try {
  await queryWithTenant(tenantId, insertQuery, values);
} catch (error) {
  throw handleUniqueViolation(error, 'Bulletin', 'Already exists for this date');
}
// Returns original error if not a unique violation
```

---

## Usage Patterns

### Router Error Handling

```typescript
// Query not found
const result = await queryWithTenant(tenantId, query, params);
if (result.rows.length === 0) {
  throw bulletinNotFound(id);
}

// Empty update
const { hasUpdates } = buildPartialUpdate(updateData);
if (!hasUpdates) {
  throw noFieldsToUpdate();
}

// Precondition check
if (bulletin.status === 'locked') {
  throw bulletinLocked('edit');
}

// Authorization
if (!hasPermission) {
  throw forbidden('edit', 'bulletin');
}
```

### Combining with Query Builders

```typescript
update: protectedProcedure
  .input(updateSchema)
  .mutation(async ({ input, ctx }) => {
    const { id, ...updateData } = input;

    const { setClause, values, nextParamIndex, hasUpdates } = buildPartialUpdate(updateData);

    if (!hasUpdates) {
      throw noFieldsToUpdate();
    }

    values.push(id);
    const result = await queryWithTenant(
      ctx.tenantId!,
      `UPDATE prayer_request SET ${setClause} WHERE id = $${nextParamIndex} RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      throw prayerNotFound(id);
    }

    return result.rows[0];
  }),
```

---

## Adding New Error Factories

When adding a new domain resource:

```typescript
// 1. Add to errors.ts
export function myResourceNotFound(id?: string): TRPCError {
  return notFound('My resource', id);
}

// 2. Export from errors.ts
// 3. Add test in errors.test.ts
describe('myResourceNotFound', () => {
  it('creates my resource NOT_FOUND error', () => {
    const error = myResourceNotFound();
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('My resource not found');
  });
});
```

---

## Testing

Tests are located in `apps/api/src/lib/__tests__/errors.test.ts`:

```bash
npm test -- errors.test.ts
```

Test coverage includes:
- All common error factories
- All domain-specific factories
- Validation error factories
- AI-related factories
- Type guards and utilities

---

## Related Documentation

- [Query Patterns](./QUERY-PATTERNS.md) - Query builder utilities
- [Mappers](./MAPPERS.md) - Row-to-DTO mapping utilities

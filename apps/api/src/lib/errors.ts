/**
 * Error Factory Utilities (Phase 2C)
 *
 * Centralized error creation functions for consistent tRPC error handling.
 * These factories provide type-safe, consistent error messages across routers.
 *
 * @see docs/architecture/ERROR-HANDLING.md
 */

import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';

// ============================================================================
// COMMON ERROR FACTORIES
// ============================================================================

/**
 * Creates a NOT_FOUND error for a specific resource type.
 *
 * @param resource - The type of resource that wasn't found
 * @param details - Optional additional details
 * @returns A TRPCError with NOT_FOUND code
 *
 * @example
 * ```typescript
 * if (result.rows.length === 0) {
 *   throw notFound('Bulletin');
 * }
 *
 * // With custom details
 * throw notFound('Prayer request', 'ID: ' + id);
 * ```
 */
export function notFound(resource: string, details?: string): TRPCError {
  const message = details
    ? `${resource} not found: ${details}`
    : `${resource} not found`;
  return new TRPCError({ code: 'NOT_FOUND', message });
}

/**
 * Creates a BAD_REQUEST error with a message.
 *
 * @param message - Description of what's wrong with the request
 * @returns A TRPCError with BAD_REQUEST code
 *
 * @example
 * ```typescript
 * if (setClauses.length === 0) {
 *   throw badRequest('No fields to update');
 * }
 * ```
 */
export function badRequest(message: string): TRPCError {
  return new TRPCError({ code: 'BAD_REQUEST', message });
}

/**
 * Creates a FORBIDDEN error for authorization failures.
 *
 * @param action - The action that was attempted
 * @param resource - The resource being accessed
 * @param reason - Optional reason for the denial
 * @returns A TRPCError with FORBIDDEN code
 *
 * @example
 * ```typescript
 * if (!hasPermission) {
 *   throw forbidden('edit', 'bulletin');
 * }
 *
 * // With reason
 * throw forbidden('lock', 'bulletin', 'Already locked by another user');
 * ```
 */
export function forbidden(action: string, resource: string, reason?: string): TRPCError {
  const message = reason
    ? `Cannot ${action} ${resource}: ${reason}`
    : `Cannot ${action} ${resource}`;
  return new TRPCError({ code: 'FORBIDDEN', message });
}

/**
 * Creates an UNAUTHORIZED error.
 *
 * @param message - Optional custom message
 * @returns A TRPCError with UNAUTHORIZED code
 *
 * @example
 * ```typescript
 * if (!ctx.userId) {
 *   throw unauthorized();
 * }
 * ```
 */
export function unauthorized(message = 'Authentication required'): TRPCError {
  return new TRPCError({ code: 'UNAUTHORIZED', message });
}

/**
 * Creates a CONFLICT error for duplicate/existing resources.
 *
 * @param resource - The type of resource that conflicts
 * @param details - Optional details about the conflict
 * @returns A TRPCError with CONFLICT code
 *
 * @example
 * ```typescript
 * // Unique constraint violation
 * throw conflict('attendance record', 'Person already checked in to this session');
 * ```
 */
export function conflict(resource: string, details?: string): TRPCError {
  const message = details
    ? `${resource} conflict: ${details}`
    : `${resource} already exists`;
  return new TRPCError({ code: 'CONFLICT', message });
}

/**
 * Creates a PRECONDITION_FAILED error for state-based failures.
 *
 * @param message - Description of the failed precondition
 * @returns A TRPCError with PRECONDITION_FAILED code
 *
 * @example
 * ```typescript
 * if (bulletin.status === 'locked') {
 *   throw preconditionFailed('Bulletin is locked and cannot be edited');
 * }
 * ```
 */
export function preconditionFailed(message: string): TRPCError {
  return new TRPCError({ code: 'PRECONDITION_FAILED', message });
}

/**
 * Creates an INTERNAL_SERVER_ERROR for unexpected failures.
 *
 * @param message - Description of what failed
 * @param cause - Optional underlying error
 * @returns A TRPCError with INTERNAL_SERVER_ERROR code
 *
 * @example
 * ```typescript
 * catch (error) {
 *   throw internalError('Failed to generate PDF', error);
 * }
 * ```
 */
export function internalError(message: string, cause?: unknown): TRPCError {
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message,
    cause: cause instanceof Error ? cause : undefined,
  });
}

// ============================================================================
// DOMAIN-SPECIFIC ERROR FACTORIES
// ============================================================================

/**
 * Creates a NOT_FOUND error for bulletins.
 */
export function bulletinNotFound(id?: string): TRPCError {
  return notFound('Bulletin', id);
}

/**
 * Creates an error when a bulletin is locked.
 *
 * @param action - The action that was attempted
 * @returns A TRPCError with PRECONDITION_FAILED code
 */
export function bulletinLocked(action = 'edit'): TRPCError {
  return preconditionFailed(`Bulletin is locked and cannot be ${action}ed`);
}

/**
 * Creates an error when trying to lock an already locked bulletin.
 */
export function bulletinAlreadyLocked(): TRPCError {
  return conflict('Bulletin', 'Already locked');
}

/**
 * Creates a NOT_FOUND error for sermons.
 */
export function sermonNotFound(id?: string): TRPCError {
  return notFound('Sermon', id);
}

/**
 * Creates a NOT_FOUND error for sermon plans.
 */
export function sermonPlanNotFound(sermonId?: string): TRPCError {
  return notFound('Sermon plan', sermonId ? `for sermon ${sermonId}` : undefined);
}

/**
 * Creates a NOT_FOUND error for prayer requests.
 */
export function prayerNotFound(id?: string): TRPCError {
  return notFound('Prayer request', id);
}

/**
 * Creates a NOT_FOUND error for attendance sessions.
 */
export function attendanceSessionNotFound(id?: string): TRPCError {
  return notFound('Attendance session', id);
}

/**
 * Creates a NOT_FOUND error for attendance records.
 */
export function attendanceRecordNotFound(): TRPCError {
  return notFound('Attendance record');
}

/**
 * Creates a CONFLICT error for duplicate attendance check-in.
 */
export function alreadyCheckedIn(): TRPCError {
  return conflict('attendance record', 'Person already checked in to this session');
}

/**
 * Creates a NOT_FOUND error for groups.
 */
export function groupNotFound(id?: string): TRPCError {
  return notFound('Group', id);
}

/**
 * Creates a NOT_FOUND error for events.
 */
export function eventNotFound(id?: string): TRPCError {
  return notFound('Event', id);
}

/**
 * Creates a NOT_FOUND error for forms.
 */
export function formNotFound(id?: string): TRPCError {
  return notFound('Form', id);
}

/**
 * Creates a NOT_FOUND error for form fields.
 */
export function formFieldNotFound(id?: string): TRPCError {
  return notFound('Field', id);
}

/**
 * Creates a NOT_FOUND error for announcements.
 */
export function announcementNotFound(id?: string): TRPCError {
  return notFound('Announcement', id);
}

/**
 * Creates a NOT_FOUND error for people/persons.
 */
export function personNotFound(id?: string): TRPCError {
  return notFound('Person', id);
}

/**
 * Creates a NOT_FOUND error for templates.
 */
export function templateNotFound(id?: string): TRPCError {
  return notFound('Template', id);
}

/**
 * Creates a NOT_FOUND error for campaigns.
 */
export function campaignNotFound(id?: string): TRPCError {
  return notFound('Campaign', id);
}

/**
 * Creates a NOT_FOUND error for donations.
 */
export function donationNotFound(id?: string): TRPCError {
  return notFound('Donation', id);
}

// ============================================================================
// VALIDATION ERROR FACTORIES
// ============================================================================

/**
 * Creates a BAD_REQUEST error for empty update requests.
 */
export function noFieldsToUpdate(): TRPCError {
  return badRequest('No fields to update');
}

/**
 * Creates a BAD_REQUEST error for missing required fields.
 *
 * @param field - The name of the missing field
 */
export function fieldRequired(field: string): TRPCError {
  return badRequest(`${field} is required`);
}

/**
 * Creates a BAD_REQUEST error for invalid field values.
 *
 * @param field - The name of the invalid field
 * @param reason - Reason why the value is invalid
 */
export function invalidField(field: string, reason?: string): TRPCError {
  const message = reason
    ? `Invalid ${field}: ${reason}`
    : `Invalid ${field}`;
  return badRequest(message);
}

// ============================================================================
// AI-RELATED ERROR FACTORIES
// ============================================================================

/**
 * Creates an error when AI features are not configured.
 */
export function aiNotConfigured(): TRPCError {
  return badRequest('AI features are not configured. Please configure AI in Settings.');
}

/**
 * Creates an error when AI quota is exceeded.
 */
export function aiQuotaExceeded(): TRPCError {
  return preconditionFailed('Monthly AI usage limit reached.');
}

/**
 * Creates an error for restricted AI content.
 *
 * @param context - The context where restricted content was detected
 */
export function restrictedContent(context = 'content'): TRPCError {
  return badRequest(
    `Draft generation is disabled for sermons containing restricted topics. Please handle this ${context} personally.`
  );
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if an error is a TRPCError.
 */
export function isTRPCError(error: unknown): error is TRPCError {
  return error instanceof TRPCError;
}

/**
 * Type guard to check if an error has a specific code.
 */
export function hasErrorCode(
  error: unknown,
  code: TRPC_ERROR_CODE_KEY
): error is TRPCError {
  return isTRPCError(error) && error.code === code;
}

/**
 * Checks if a PostgreSQL error is a unique constraint violation.
 *
 * @param error - The error to check
 * @returns True if this is a unique constraint violation (error code 23505)
 */
export function isUniqueViolation(error: unknown): boolean {
  if (error instanceof Error && 'code' in error) {
    return (error as { code: string }).code === '23505';
  }
  return false;
}

/**
 * Wraps a unique constraint violation as a CONFLICT error.
 *
 * @param error - The PostgreSQL error
 * @param resource - The resource type for the error message
 * @param details - Optional conflict details
 * @returns The original error if not a unique violation, or a CONFLICT TRPCError
 */
export function handleUniqueViolation(
  error: unknown,
  resource: string,
  details?: string
): unknown {
  if (isUniqueViolation(error)) {
    return conflict(resource, details);
  }
  return error;
}

/**
 * Error Factory Tests (Phase 2C)
 *
 * Tests the error factory functions in errors.ts.
 * Uses node environment - tests pure functions without DOM.
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { TRPCError } from '@trpc/server';
import {
  // Common error factories
  notFound,
  badRequest,
  forbidden,
  unauthorized,
  conflict,
  preconditionFailed,
  internalError,
  // Domain-specific error factories
  bulletinNotFound,
  bulletinLocked,
  bulletinAlreadyLocked,
  sermonNotFound,
  sermonPlanNotFound,
  prayerNotFound,
  attendanceSessionNotFound,
  attendanceRecordNotFound,
  alreadyCheckedIn,
  groupNotFound,
  eventNotFound,
  formNotFound,
  formFieldNotFound,
  announcementNotFound,
  personNotFound,
  templateNotFound,
  campaignNotFound,
  donationNotFound,
  // Validation error factories
  noFieldsToUpdate,
  fieldRequired,
  invalidField,
  // AI-related error factories
  aiNotConfigured,
  aiQuotaExceeded,
  restrictedContent,
  // Type guards and utilities
  isTRPCError,
  hasErrorCode,
  isUniqueViolation,
  handleUniqueViolation,
} from '../errors';

// ============================================================================
// COMMON ERROR FACTORY TESTS
// ============================================================================

describe('notFound', () => {
  it('creates NOT_FOUND error with resource name', () => {
    const error = notFound('Bulletin');
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Bulletin not found');
  });

  it('creates NOT_FOUND error with details', () => {
    const error = notFound('Bulletin', 'ID: abc-123');
    expect(error.message).toBe('Bulletin not found: ID: abc-123');
  });
});

describe('badRequest', () => {
  it('creates BAD_REQUEST error with message', () => {
    const error = badRequest('No fields to update');
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('No fields to update');
  });
});

describe('forbidden', () => {
  it('creates FORBIDDEN error with action and resource', () => {
    const error = forbidden('edit', 'bulletin');
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Cannot edit bulletin');
  });

  it('creates FORBIDDEN error with reason', () => {
    const error = forbidden('lock', 'bulletin', 'Already locked');
    expect(error.message).toBe('Cannot lock bulletin: Already locked');
  });
});

describe('unauthorized', () => {
  it('creates UNAUTHORIZED error with default message', () => {
    const error = unauthorized();
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Authentication required');
  });

  it('creates UNAUTHORIZED error with custom message', () => {
    const error = unauthorized('Session expired');
    expect(error.message).toBe('Session expired');
  });
});

describe('conflict', () => {
  it('creates CONFLICT error with resource', () => {
    const error = conflict('Bulletin');
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Bulletin already exists');
  });

  it('creates CONFLICT error with details', () => {
    const error = conflict('Bulletin', 'Already exists for this date');
    expect(error.message).toBe('Bulletin conflict: Already exists for this date');
  });
});

describe('preconditionFailed', () => {
  it('creates PRECONDITION_FAILED error', () => {
    const error = preconditionFailed('Bulletin is locked');
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('PRECONDITION_FAILED');
    expect(error.message).toBe('Bulletin is locked');
  });
});

describe('internalError', () => {
  it('creates INTERNAL_SERVER_ERROR', () => {
    const error = internalError('Database connection failed');
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error.message).toBe('Database connection failed');
  });

  it('includes cause when provided', () => {
    const cause = new Error('Connection timeout');
    const error = internalError('Database connection failed', cause);
    expect(error.cause).toBe(cause);
  });
});

// ============================================================================
// DOMAIN-SPECIFIC ERROR FACTORY TESTS
// ============================================================================

describe('bulletinNotFound', () => {
  it('creates bulletin NOT_FOUND error', () => {
    const error = bulletinNotFound();
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Bulletin not found');
  });

  it('includes ID when provided', () => {
    const error = bulletinNotFound('abc-123');
    expect(error.message).toBe('Bulletin not found: abc-123');
  });
});

describe('bulletinLocked', () => {
  it('creates precondition error for edit action', () => {
    const error = bulletinLocked();
    expect(error.code).toBe('PRECONDITION_FAILED');
    expect(error.message).toBe('Bulletin is locked and cannot be edited');
  });

  it('uses custom action', () => {
    const error = bulletinLocked('delete');
    expect(error.message).toBe('Bulletin is locked and cannot be deleteed');
  });
});

describe('bulletinAlreadyLocked', () => {
  it('creates conflict error for already locked', () => {
    const error = bulletinAlreadyLocked();
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Bulletin conflict: Already locked');
  });
});

describe('sermonNotFound', () => {
  it('creates sermon NOT_FOUND error', () => {
    const error = sermonNotFound();
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Sermon not found');
  });
});

describe('sermonPlanNotFound', () => {
  it('creates sermon plan NOT_FOUND error', () => {
    const error = sermonPlanNotFound();
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Sermon plan not found');
  });

  it('includes sermon ID context', () => {
    const error = sermonPlanNotFound('sermon-123');
    expect(error.message).toBe('Sermon plan not found: for sermon sermon-123');
  });
});

describe('alreadyCheckedIn', () => {
  it('creates conflict error for duplicate check-in', () => {
    const error = alreadyCheckedIn();
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('attendance record conflict: Person already checked in to this session');
  });
});

describe('domain resource not found errors', () => {
  it('prayerNotFound creates correct error', () => {
    expect(prayerNotFound().message).toBe('Prayer request not found');
  });

  it('attendanceSessionNotFound creates correct error', () => {
    expect(attendanceSessionNotFound().message).toBe('Attendance session not found');
  });

  it('attendanceRecordNotFound creates correct error', () => {
    expect(attendanceRecordNotFound().message).toBe('Attendance record not found');
  });

  it('groupNotFound creates correct error', () => {
    expect(groupNotFound().message).toBe('Group not found');
  });

  it('eventNotFound creates correct error', () => {
    expect(eventNotFound().message).toBe('Event not found');
  });

  it('formNotFound creates correct error', () => {
    expect(formNotFound().message).toBe('Form not found');
  });

  it('formFieldNotFound creates correct error', () => {
    expect(formFieldNotFound().message).toBe('Field not found');
  });

  it('announcementNotFound creates correct error', () => {
    expect(announcementNotFound().message).toBe('Announcement not found');
  });

  it('personNotFound creates correct error', () => {
    expect(personNotFound().message).toBe('Person not found');
  });

  it('templateNotFound creates correct error', () => {
    expect(templateNotFound().message).toBe('Template not found');
  });

  it('campaignNotFound creates correct error', () => {
    expect(campaignNotFound().message).toBe('Campaign not found');
  });

  it('donationNotFound creates correct error', () => {
    expect(donationNotFound().message).toBe('Donation not found');
  });
});

// ============================================================================
// VALIDATION ERROR FACTORY TESTS
// ============================================================================

describe('noFieldsToUpdate', () => {
  it('creates BAD_REQUEST error for empty updates', () => {
    const error = noFieldsToUpdate();
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('No fields to update');
  });
});

describe('fieldRequired', () => {
  it('creates BAD_REQUEST error for missing field', () => {
    const error = fieldRequired('email');
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('email is required');
  });
});

describe('invalidField', () => {
  it('creates BAD_REQUEST error for invalid field', () => {
    const error = invalidField('email');
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid email');
  });

  it('includes reason when provided', () => {
    const error = invalidField('email', 'Must be a valid email address');
    expect(error.message).toBe('Invalid email: Must be a valid email address');
  });
});

// ============================================================================
// AI-RELATED ERROR FACTORY TESTS
// ============================================================================

describe('aiNotConfigured', () => {
  it('creates BAD_REQUEST error for missing AI config', () => {
    const error = aiNotConfigured();
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toContain('AI features are not configured');
  });
});

describe('aiQuotaExceeded', () => {
  it('creates PRECONDITION_FAILED error for quota', () => {
    const error = aiQuotaExceeded();
    expect(error.code).toBe('PRECONDITION_FAILED');
    expect(error.message).toContain('limit reached');
  });
});

describe('restrictedContent', () => {
  it('creates BAD_REQUEST error with default context', () => {
    const error = restrictedContent();
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toContain('restricted topics');
    expect(error.message).toContain('personally');
  });

  it('uses custom context', () => {
    const error = restrictedContent('sermon');
    expect(error.message).toContain('sermon');
  });
});

// ============================================================================
// TYPE GUARD AND UTILITY TESTS
// ============================================================================

describe('isTRPCError', () => {
  it('returns true for TRPCError', () => {
    const error = new TRPCError({ code: 'NOT_FOUND', message: 'Test' });
    expect(isTRPCError(error)).toBe(true);
  });

  it('returns false for regular Error', () => {
    const error = new Error('Test');
    expect(isTRPCError(error)).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isTRPCError(null)).toBe(false);
    expect(isTRPCError(undefined)).toBe(false);
    expect(isTRPCError('string')).toBe(false);
    expect(isTRPCError({})).toBe(false);
  });
});

describe('hasErrorCode', () => {
  it('returns true when error has matching code', () => {
    const error = new TRPCError({ code: 'NOT_FOUND', message: 'Test' });
    expect(hasErrorCode(error, 'NOT_FOUND')).toBe(true);
  });

  it('returns false when code does not match', () => {
    const error = new TRPCError({ code: 'BAD_REQUEST', message: 'Test' });
    expect(hasErrorCode(error, 'NOT_FOUND')).toBe(false);
  });

  it('returns false for non-TRPCError', () => {
    const error = new Error('Test');
    expect(hasErrorCode(error, 'NOT_FOUND')).toBe(false);
  });
});

describe('isUniqueViolation', () => {
  it('returns true for PostgreSQL unique constraint error', () => {
    const error = Object.assign(new Error('unique violation'), { code: '23505' });
    expect(isUniqueViolation(error)).toBe(true);
  });

  it('returns false for other error codes', () => {
    const error = Object.assign(new Error('other error'), { code: '42000' });
    expect(isUniqueViolation(error)).toBe(false);
  });

  it('returns false for errors without code', () => {
    expect(isUniqueViolation(new Error('test'))).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation('string')).toBe(false);
  });
});

describe('handleUniqueViolation', () => {
  it('returns CONFLICT error for unique violation', () => {
    const error = Object.assign(new Error('unique violation'), { code: '23505' });
    const result = handleUniqueViolation(error, 'Bulletin', 'Already exists for this date');

    expect(result).toBeInstanceOf(TRPCError);
    expect((result as TRPCError).code).toBe('CONFLICT');
  });

  it('returns original error for non-unique-violation', () => {
    const error = new Error('other error');
    const result = handleUniqueViolation(error, 'Bulletin');

    expect(result).toBe(error);
  });
});

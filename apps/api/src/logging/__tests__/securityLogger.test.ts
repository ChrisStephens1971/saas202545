/**
 * Tests for security logger module.
 *
 * @module logging/__tests__/securityLogger.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the logger before importing the module
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  SecurityEventCategory,
  SecurityEventSeverity,
  logSecurityEvent,
  logAuthSuccess,
  logAuthFailure,
  logAccessDenied,
  logTenantViolation,
  logCorsViolation,
  logCsrfFailure,
  logRateLimitExceeded,
  logSensitiveDataAccess,
} from '../securityLogger';
import { logger } from '../../utils/logger';

describe('securityLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should route INFO events to logger.info', () => {
      logSecurityEvent({
        eventType: 'TEST_EVENT',
        category: SecurityEventCategory.AUDIT,
        severity: SecurityEventSeverity.INFO,
        message: 'Test message',
        timestamp: new Date().toISOString(),
      });

      expect(logger.info).toHaveBeenCalledWith(
        'SECURITY_INFO',
        expect.objectContaining({
          eventType: 'TEST_EVENT',
          securityEvent: true,
        })
      );
    });

    it('should route WARN events to logger.warn', () => {
      logSecurityEvent({
        eventType: 'TEST_WARNING',
        category: SecurityEventCategory.THREAT,
        severity: SecurityEventSeverity.WARN,
        message: 'Warning message',
        timestamp: new Date().toISOString(),
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SECURITY_WARN',
        expect.objectContaining({
          eventType: 'TEST_WARNING',
        })
      );
    });

    it('should route ERROR events to logger.error', () => {
      logSecurityEvent({
        eventType: 'TEST_ERROR',
        category: SecurityEventCategory.AUTH,
        severity: SecurityEventSeverity.ERROR,
        message: 'Error message',
        timestamp: new Date().toISOString(),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'SECURITY_ERROR',
        expect.objectContaining({
          eventType: 'TEST_ERROR',
        })
      );
    });

    it('should route CRITICAL events to logger.error', () => {
      logSecurityEvent({
        eventType: 'TEST_CRITICAL',
        category: SecurityEventCategory.THREAT,
        severity: SecurityEventSeverity.CRITICAL,
        message: 'Critical message',
        timestamp: new Date().toISOString(),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'SECURITY_CRITICAL',
        expect.objectContaining({
          eventType: 'TEST_CRITICAL',
        })
      );
    });

    it('should mask sensitive data in details', () => {
      logSecurityEvent({
        eventType: 'TEST_SENSITIVE',
        category: SecurityEventCategory.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Test with sensitive data',
        timestamp: new Date().toISOString(),
        details: {
          username: 'testuser',
          password: 'supersecret',
          apiKey: 'sk-12345',
          normalField: 'value',
        },
      });

      expect(logger.info).toHaveBeenCalledWith(
        'SECURITY_INFO',
        expect.objectContaining({
          details: expect.objectContaining({
            username: 'testuser',
            password: '[REDACTED]',
            apiKey: '[REDACTED]',
            normalField: 'value',
          }),
        })
      );
    });
  });

  describe('pre-defined loggers', () => {
    it('logAuthSuccess should log INFO level auth event', () => {
      logAuthSuccess({
        userId: 'user-123',
        tenantId: 'tenant-456',
        ip: '192.168.1.1',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'SECURITY_INFO',
        expect.objectContaining({
          eventType: 'AUTH_LOGIN_SUCCESS',
          category: SecurityEventCategory.AUTH,
          userId: 'user-123',
          tenantId: 'tenant-456',
        })
      );
    });

    it('logAuthFailure should log WARN level auth event', () => {
      logAuthFailure({
        reason: 'Invalid credentials',
        attemptedUser: 'admin',
        ip: '192.168.1.1',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SECURITY_WARN',
        expect.objectContaining({
          eventType: 'AUTH_LOGIN_FAILURE',
          category: SecurityEventCategory.AUTH,
        })
      );
    });

    it('logAccessDenied should log WARN level access event', () => {
      logAccessDenied({
        userId: 'user-123',
        resource: 'donations',
        action: 'export',
        reason: 'Insufficient permissions',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SECURITY_WARN',
        expect.objectContaining({
          eventType: 'ACCESS_DENIED',
          category: SecurityEventCategory.ACCESS,
        })
      );
    });

    it('logTenantViolation should log ERROR level threat event', () => {
      logTenantViolation({
        userId: 'user-123',
        requestedTenantId: 'tenant-other',
        userTenantId: 'tenant-123',
      });

      expect(logger.error).toHaveBeenCalledWith(
        'SECURITY_ERROR',
        expect.objectContaining({
          eventType: 'TENANT_ISOLATION_VIOLATION',
          category: SecurityEventCategory.THREAT,
        })
      );
    });

    it('logCorsViolation should log WARN level threat event', () => {
      logCorsViolation({
        origin: 'https://evil.com',
        path: '/api/data',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SECURITY_WARN',
        expect.objectContaining({
          eventType: 'CORS_VIOLATION',
          category: SecurityEventCategory.THREAT,
        })
      );
    });

    it('logCsrfFailure should log WARN level threat event', () => {
      logCsrfFailure({
        reason: 'missing',
        ip: '192.168.1.1',
        path: '/api/data',
        method: 'POST',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SECURITY_WARN',
        expect.objectContaining({
          eventType: 'CSRF_VALIDATION_FAILURE',
          category: SecurityEventCategory.THREAT,
        })
      );
    });

    it('logRateLimitExceeded should log WARN level threat event', () => {
      logRateLimitExceeded({
        ip: '192.168.1.1',
        path: '/api/auth',
        limitType: 'auth',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SECURITY_WARN',
        expect.objectContaining({
          eventType: 'RATE_LIMIT_EXCEEDED',
          category: SecurityEventCategory.THREAT,
        })
      );
    });

    it('logSensitiveDataAccess should log INFO level audit event', () => {
      logSensitiveDataAccess({
        userId: 'user-123',
        tenantId: 'tenant-456',
        dataType: 'donations',
        action: 'export',
        recordCount: 100,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'SECURITY_INFO',
        expect.objectContaining({
          eventType: 'SENSITIVE_DATA_ACCESS',
          category: SecurityEventCategory.AUDIT,
        })
      );
    });
  });
});

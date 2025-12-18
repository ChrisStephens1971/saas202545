/**
 * Security Event Logging Module
 *
 * SECURITY FIX (Phase 3 - M4): Implement structured security event logging.
 *
 * This module provides:
 * - Structured logging for security-relevant events
 * - Consistent event format for SIEM integration
 * - Event categorization (auth, access, threat, audit)
 * - Sensitive data masking
 *
 * Events logged:
 * - Authentication success/failure
 * - Authorization failures (role/permission denials)
 * - CORS violations
 * - CSRF violations
 * - Rate limiting triggers
 * - Tenant isolation violations
 * - Suspicious activity patterns
 *
 * @module logging/securityLogger
 * @see docs/SECURITY-AUDIT-2025-12-04.md
 */

import { logger } from '../utils/logger';

/**
 * Security event categories for classification and filtering.
 */
export enum SecurityEventCategory {
  /** Authentication events (login, logout, token operations) */
  AUTH = 'AUTH',
  /** Authorization events (permission checks, role denials) */
  ACCESS = 'ACCESS',
  /** Potential threat indicators (rate limits, CSRF, suspicious patterns) */
  THREAT = 'THREAT',
  /** Audit trail events (data access, modifications) */
  AUDIT = 'AUDIT',
  /** Security configuration changes */
  CONFIG = 'CONFIG',
}

/**
 * Security event severity levels.
 */
export enum SecurityEventSeverity {
  /** Informational (successful operations, normal activity) */
  INFO = 'INFO',
  /** Warning (policy violations, potential issues) */
  WARN = 'WARN',
  /** Error (failed security checks, blocked actions) */
  ERROR = 'ERROR',
  /** Critical (active attacks, data breaches) */
  CRITICAL = 'CRITICAL',
}

/**
 * Base interface for security events.
 */
export interface SecurityEvent {
  /** Unique event type identifier (e.g., 'AUTH_LOGIN_SUCCESS') */
  eventType: string;
  /** Event category for filtering */
  category: SecurityEventCategory;
  /** Event severity */
  severity: SecurityEventSeverity;
  /** Human-readable event description */
  message: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Request correlation ID (if available) */
  correlationId?: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Tenant identifier */
  tenantId?: string;
  /** User identifier (if authenticated) */
  userId?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Additional event-specific data */
  details?: Record<string, unknown>;
}

/**
 * Mask sensitive data in log entries.
 * Prevents accidental exposure of secrets in logs.
 */
function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  // All patterns are lowercase for case-insensitive matching
  const sensitivePatterns = [
    'password',
    'token',
    'secret',
    'apikey',      // matches apiKey, api_key, etc.
    'api_key',
    'authorization',
    'cookie',
    'creditcard',
    'credit_card',
    'ssn',
    'encryptionkey',
    'encryption_key',
    'private',
    'credential',
  ];

  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (sensitivePatterns.some((pattern) => lowerKey.includes(pattern))) {
      masked[key] = '[REDACTED]';
    }
  }

  return masked;
}

/**
 * Log a security event with structured format.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    details: event.details ? maskSensitiveData(event.details) : undefined,
    // Add consistent security log marker for filtering
    securityEvent: true,
  };

  // Route to appropriate log level based on severity
  switch (event.severity) {
    case SecurityEventSeverity.CRITICAL:
      logger.error('SECURITY_CRITICAL', logEntry);
      break;
    case SecurityEventSeverity.ERROR:
      logger.error('SECURITY_ERROR', logEntry);
      break;
    case SecurityEventSeverity.WARN:
      logger.warn('SECURITY_WARN', logEntry);
      break;
    case SecurityEventSeverity.INFO:
    default:
      logger.info('SECURITY_INFO', logEntry);
      break;
  }
}

// ============================================================================
// Pre-defined security event loggers for common scenarios
// ============================================================================

/**
 * Log successful authentication.
 */
export function logAuthSuccess(params: {
  userId: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
}): void {
  logSecurityEvent({
    eventType: 'AUTH_LOGIN_SUCCESS',
    category: SecurityEventCategory.AUTH,
    severity: SecurityEventSeverity.INFO,
    message: 'User authentication successful',
    timestamp: new Date().toISOString(),
    ...params,
  });
}

/**
 * Log failed authentication attempt.
 */
export function logAuthFailure(params: {
  reason: string;
  attemptedUser?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}): void {
  logSecurityEvent({
    eventType: 'AUTH_LOGIN_FAILURE',
    category: SecurityEventCategory.AUTH,
    severity: SecurityEventSeverity.WARN,
    message: `Authentication failed: ${params.reason}`,
    timestamp: new Date().toISOString(),
    ...params,
  });
}

/**
 * Log authorization/permission denial.
 */
export function logAccessDenied(params: {
  userId?: string;
  tenantId?: string;
  resource: string;
  action: string;
  reason: string;
  ip?: string;
  path?: string;
}): void {
  logSecurityEvent({
    eventType: 'ACCESS_DENIED',
    category: SecurityEventCategory.ACCESS,
    severity: SecurityEventSeverity.WARN,
    message: `Access denied: ${params.action} on ${params.resource}`,
    timestamp: new Date().toISOString(),
    details: { reason: params.reason },
    ...params,
  });
}

/**
 * Log tenant isolation violation attempt.
 */
export function logTenantViolation(params: {
  userId?: string;
  requestedTenantId: string;
  userTenantId?: string;
  ip?: string;
  path?: string;
  method?: string;
}): void {
  logSecurityEvent({
    eventType: 'TENANT_ISOLATION_VIOLATION',
    category: SecurityEventCategory.THREAT,
    severity: SecurityEventSeverity.ERROR,
    message: 'Attempted cross-tenant access',
    timestamp: new Date().toISOString(),
    tenantId: params.userTenantId,
    ...params,
    details: {
      requestedTenantId: params.requestedTenantId,
      userTenantId: params.userTenantId,
    },
  });
}

/**
 * Log CORS violation.
 */
export function logCorsViolation(params: {
  origin: string;
  ip?: string;
  path?: string;
  method?: string;
}): void {
  logSecurityEvent({
    eventType: 'CORS_VIOLATION',
    category: SecurityEventCategory.THREAT,
    severity: SecurityEventSeverity.WARN,
    message: `CORS request blocked from unauthorized origin: ${params.origin}`,
    timestamp: new Date().toISOString(),
    ...params,
    details: { blockedOrigin: params.origin },
  });
}

/**
 * Log CSRF validation failure.
 */
export function logCsrfFailure(params: {
  reason: 'missing' | 'invalid';
  ip?: string;
  path?: string;
  method?: string;
  userAgent?: string;
}): void {
  logSecurityEvent({
    eventType: 'CSRF_VALIDATION_FAILURE',
    category: SecurityEventCategory.THREAT,
    severity: SecurityEventSeverity.WARN,
    message: `CSRF validation failed: ${params.reason} token`,
    timestamp: new Date().toISOString(),
    ...params,
  });
}

/**
 * Log rate limit exceeded.
 */
export function logRateLimitExceeded(params: {
  ip: string;
  path?: string;
  limitType: 'general' | 'auth' | 'api';
  userAgent?: string;
}): void {
  logSecurityEvent({
    eventType: 'RATE_LIMIT_EXCEEDED',
    category: SecurityEventCategory.THREAT,
    severity: SecurityEventSeverity.WARN,
    message: `Rate limit exceeded for ${params.limitType} endpoint`,
    timestamp: new Date().toISOString(),
    ...params,
    details: { limitType: params.limitType },
  });
}

/**
 * Log sensitive data access (for audit trail).
 */
export function logSensitiveDataAccess(params: {
  userId: string;
  tenantId: string;
  dataType: string;
  action: 'view' | 'export' | 'modify' | 'delete';
  recordCount?: number;
  ip?: string;
  path?: string;
}): void {
  logSecurityEvent({
    eventType: 'SENSITIVE_DATA_ACCESS',
    category: SecurityEventCategory.AUDIT,
    severity: SecurityEventSeverity.INFO,
    message: `${params.action} ${params.dataType} data`,
    timestamp: new Date().toISOString(),
    ...params,
    details: {
      dataType: params.dataType,
      action: params.action,
      recordCount: params.recordCount,
    },
  });
}

/**
 * Log security configuration change.
 */
export function logSecurityConfigChange(params: {
  userId: string;
  tenantId?: string;
  setting: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
}): void {
  logSecurityEvent({
    eventType: 'SECURITY_CONFIG_CHANGE',
    category: SecurityEventCategory.CONFIG,
    severity: SecurityEventSeverity.WARN,
    message: `Security setting changed: ${params.setting}`,
    timestamp: new Date().toISOString(),
    ...params,
    details: {
      setting: params.setting,
      // Mask values in case they're sensitive
      changed: true,
    },
  });
}

/**
 * Log JWT verification failure.
 */
export function logJwtVerificationFailure(params: {
  reason: string;
  ip?: string;
  path?: string;
  userAgent?: string;
}): void {
  logSecurityEvent({
    eventType: 'JWT_VERIFICATION_FAILURE',
    category: SecurityEventCategory.AUTH,
    severity: SecurityEventSeverity.WARN,
    message: `JWT verification failed: ${params.reason}`,
    timestamp: new Date().toISOString(),
    ...params,
  });
}

/**
 * Log suspicious activity pattern (for threat detection).
 */
export function logSuspiciousActivity(params: {
  activityType: string;
  description: string;
  ip?: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  details?: Record<string, unknown>;
}): void {
  logSecurityEvent({
    eventType: 'SUSPICIOUS_ACTIVITY',
    category: SecurityEventCategory.THREAT,
    severity: SecurityEventSeverity.ERROR,
    message: `Suspicious activity detected: ${params.activityType}`,
    timestamp: new Date().toISOString(),
    ...params,
    details: {
      activityType: params.activityType,
      description: params.description,
      ...params.details,
    },
  });
}

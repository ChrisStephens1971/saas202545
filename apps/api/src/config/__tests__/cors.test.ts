/**
 * Tests for CORS configuration module.
 *
 * @module config/__tests__/cors.test
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Store original env values
const originalEnv = { ...process.env };

// Helper to reset module and reimport with new env
async function reimportCorsModule() {
  // Clear module cache to force reimport with new env
  jest.resetModules();
  // Use dynamic import with cache busting
  const modulePath = '../cors';
  return import(modulePath);
}

describe('cors config', () => {
  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('isOriginAllowed', () => {
    it('should allow undefined origin (same-origin requests)', async () => {
      const { isOriginAllowed } = await reimportCorsModule();
      expect(isOriginAllowed(undefined)).toBe(true);
    });

    it('should allow configured origins', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
      process.env.NODE_ENV = 'production';
      const { isOriginAllowed } = await reimportCorsModule();

      expect(isOriginAllowed('https://example.com')).toBe(true);
      expect(isOriginAllowed('https://app.example.com')).toBe(true);
    });

    it('should reject non-configured origins in production', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.NODE_ENV = 'production';
      const { isOriginAllowed } = await reimportCorsModule();

      expect(isOriginAllowed('https://malicious.com')).toBe(false);
    });

    it('should trim whitespace from origins', async () => {
      process.env.ALLOWED_ORIGINS = '  https://example.com  ,  https://app.example.com  ';
      process.env.NODE_ENV = 'production';
      const { isOriginAllowed } = await reimportCorsModule();

      expect(isOriginAllowed('https://example.com')).toBe(true);
      expect(isOriginAllowed('https://app.example.com')).toBe(true);
    });

    it('should reject origins with trailing slashes', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com/';
      process.env.NODE_ENV = 'production';
      const { isOriginAllowed } = await reimportCorsModule();

      // Origin with trailing slash should be filtered out as invalid
      expect(isOriginAllowed('https://example.com')).toBe(false);
    });
  });

  describe('getAllowedOrigins', () => {
    it('should return default dev origins when no env set in development', async () => {
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'development';
      const { getAllowedOrigins } = await reimportCorsModule();

      const origins = getAllowedOrigins();
      expect(origins).toContain('http://localhost:3045');
      expect(origins).toContain('http://127.0.0.1:3045');
    });

    it('should return empty array in production when no env set', async () => {
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';
      const { getAllowedOrigins } = await reimportCorsModule();

      const origins = getAllowedOrigins();
      expect(origins).toHaveLength(0);
    });

    it('should return frozen array', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.NODE_ENV = 'production';
      const { getAllowedOrigins } = await reimportCorsModule();

      const origins = getAllowedOrigins();
      expect(Object.isFrozen(origins)).toBe(true);
    });
  });

  describe('corsOptions', () => {
    it('should have credentials enabled', async () => {
      const { corsOptions } = await reimportCorsModule();
      expect(corsOptions.credentials).toBe(true);
    });

    it('should include required HTTP methods', async () => {
      const { corsOptions } = await reimportCorsModule();
      expect(corsOptions.methods).toContain('GET');
      expect(corsOptions.methods).toContain('POST');
      expect(corsOptions.methods).toContain('PUT');
      expect(corsOptions.methods).toContain('DELETE');
    });

    it('should include CSRF token header in allowed headers', async () => {
      const { corsOptions } = await reimportCorsModule();
      expect(corsOptions.allowedHeaders).toContain('X-CSRF-Token');
    });

    it('should have appropriate maxAge for caching', async () => {
      const { corsOptions } = await reimportCorsModule();
      expect(corsOptions.maxAge).toBeGreaterThan(0);
      expect(corsOptions.maxAge).toBeLessThanOrEqual(86400); // Max 24 hours
    });
  });

  describe('origin validation', () => {
    it('should reject non-http/https origins', async () => {
      process.env.ALLOWED_ORIGINS = 'ftp://example.com';
      process.env.NODE_ENV = 'production';
      const { getAllowedOrigins } = await reimportCorsModule();

      const origins = getAllowedOrigins();
      expect(origins).not.toContain('ftp://example.com');
    });

    it('should reject invalid URLs', async () => {
      process.env.ALLOWED_ORIGINS = 'not-a-valid-url,https://valid.com';
      process.env.NODE_ENV = 'production';
      const { getAllowedOrigins } = await reimportCorsModule();

      const origins = getAllowedOrigins();
      expect(origins).not.toContain('not-a-valid-url');
      expect(origins).toContain('https://valid.com');
    });
  });
});

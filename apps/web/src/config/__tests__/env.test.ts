/**
 * Unit tests for the env helper module.
 *
 * These tests verify the type-safe environment detection utilities.
 * Since NODE_ENV is read at module load time, we test the exported values
 * and the type definitions rather than mocking process.env.
 */

import { describe, it, expect } from '@jest/globals';
import {
  NodeEnv,
  NODE_ENV,
  IS_DEV,
  IS_TEST,
  IS_STAGING,
  IS_PROD,
  IS_PROD_LIKE,
  IS_NON_PROD,
} from '../env';

describe('env helper', () => {
  describe('NODE_ENV type', () => {
    it('should be a valid NodeEnv type', () => {
      const validValues: NodeEnv[] = ['development', 'test', 'production', 'staging'];
      expect(validValues).toContain(NODE_ENV);
    });

    it('should not be an unexpected value', () => {
      const invalidValues = ['undefined', 'null', '', 'prod', 'dev'];
      expect(invalidValues).not.toContain(NODE_ENV);
    });
  });

  describe('boolean exports', () => {
    it('should have exactly one truthy environment flag', () => {
      const flags = [IS_DEV, IS_TEST, IS_STAGING, IS_PROD];
      const trueFlags = flags.filter(Boolean);
      expect(trueFlags.length).toBe(1);
    });

    it('IS_DEV should match NODE_ENV === development', () => {
      expect(IS_DEV).toBe(NODE_ENV === 'development');
    });

    it('IS_TEST should match NODE_ENV === test', () => {
      expect(IS_TEST).toBe(NODE_ENV === 'test');
    });

    it('IS_STAGING should match NODE_ENV === staging', () => {
      expect(IS_STAGING).toBe(NODE_ENV === 'staging');
    });

    it('IS_PROD should match NODE_ENV === production', () => {
      expect(IS_PROD).toBe(NODE_ENV === 'production');
    });
  });

  describe('composite flags', () => {
    it('IS_PROD_LIKE should be true when IS_PROD or IS_STAGING', () => {
      expect(IS_PROD_LIKE).toBe(IS_PROD || IS_STAGING);
    });

    it('IS_NON_PROD should be the opposite of IS_PROD_LIKE', () => {
      expect(IS_NON_PROD).toBe(!IS_PROD_LIKE);
    });

    it('IS_DEV and IS_TEST should always be IS_NON_PROD', () => {
      if (IS_DEV || IS_TEST) {
        expect(IS_NON_PROD).toBe(true);
      }
    });
  });

  describe('runtime consistency', () => {
    it('NODE_ENV should be a string', () => {
      expect(typeof NODE_ENV).toBe('string');
    });

    it('all boolean exports should be booleans', () => {
      expect(typeof IS_DEV).toBe('boolean');
      expect(typeof IS_TEST).toBe('boolean');
      expect(typeof IS_STAGING).toBe('boolean');
      expect(typeof IS_PROD).toBe('boolean');
      expect(typeof IS_PROD_LIKE).toBe('boolean');
      expect(typeof IS_NON_PROD).toBe('boolean');
    });
  });

  // Integration test: verify current environment
  describe('current environment (integration)', () => {
    it('should detect test environment when running tests', () => {
      // When running via Jest, NODE_ENV is typically 'test'
      // This test validates the helper is working in the test environment
      if (process.env.NODE_ENV === 'test') {
        expect(IS_TEST).toBe(true);
        expect(IS_NON_PROD).toBe(true);
      }
    });
  });
});

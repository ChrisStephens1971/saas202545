/**
 * Centralized environment configuration for the Web app.
 *
 * This module provides strongly-typed environment handling to eliminate
 * TypeScript errors around NODE_ENV comparisons (especially 'staging').
 *
 * SECURITY NOTE: This does not change any runtime behavior from Phase 1/2.
 * It only provides type-safe wrappers around existing environment checks.
 *
 * @module config/env
 */

/**
 * Valid NODE_ENV values for this application.
 * Extends the standard Node.js types to include 'staging'.
 */
export type NodeEnv = 'development' | 'test' | 'production' | 'staging';

/**
 * Raw NODE_ENV value from process.env, cast to our extended type.
 * Falls back to 'development' if not set or invalid.
 */
function getNodeEnv(): NodeEnv {
  const env = process.env.NODE_ENV;

  // Validate against known values
  if (env === 'development' || env === 'test' || env === 'production' || env === 'staging') {
    return env;
  }

  // Default to development for safety (matches existing behavior)
  return 'development';
}

/**
 * The current NODE_ENV value, strongly typed.
 */
export const NODE_ENV: NodeEnv = getNodeEnv();

/**
 * True when running in development mode (NODE_ENV === 'development').
 */
export const IS_DEV: boolean = NODE_ENV === 'development';

/**
 * True when running in test mode (NODE_ENV === 'test').
 */
export const IS_TEST: boolean = NODE_ENV === 'test';

/**
 * True when running in staging mode (NODE_ENV === 'staging').
 */
export const IS_STAGING: boolean = NODE_ENV === 'staging';

/**
 * True when running in production mode (NODE_ENV === 'production').
 * Note: This is strict production only, not staging.
 */
export const IS_PROD: boolean = NODE_ENV === 'production';

/**
 * True when running in production-like environments (production OR staging).
 * Use this for security checks that should apply to both prod and staging.
 */
export const IS_PROD_LIKE: boolean = IS_PROD || IS_STAGING;

/**
 * True when NOT in production-like environments.
 * Use this for development-only features.
 */
export const IS_NON_PROD: boolean = !IS_PROD_LIKE;

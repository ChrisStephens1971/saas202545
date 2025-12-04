/**
 * Encryption utilities for server-side secret storage.
 *
 * Uses AES-256-GCM (AEAD cipher) for authenticated encryption.
 *
 * Required environment variable:
 *   APP_ENCRYPTION_KEY - A 32-byte key encoded as hex (64 characters)
 *                        Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Storage format:
 *   base64(IV || authTag || ciphertext)
 *   - IV: 12 bytes
 *   - authTag: 16 bytes
 *   - ciphertext: variable length
 *
 * SECURITY FIX (H10): Encryption Key Requirements
 * - Production: MUST have APP_ENCRYPTION_KEY set (validateEncryptionConfig will throw if not)
 * - Development: Optional but recommended
 * - Call validateEncryptionConfig() at server startup for production environments
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (H10)
 */

import crypto from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment.
 * Returns null if not configured.
 */
function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.APP_ENCRYPTION_KEY;

  if (!keyHex) {
    return null;
  }

  // Key should be 32 bytes (64 hex characters)
  if (keyHex.length !== 64) {
    logger.error('[Encryption] APP_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    return null;
  }

  try {
    return Buffer.from(keyHex, 'hex');
  } catch (error) {
    logger.error('[Encryption] Invalid APP_ENCRYPTION_KEY format');
    return null;
  }
}

/**
 * Check if encryption is available.
 * Use this to avoid throwing errors in non-critical paths.
 */
export function isEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null;
}

/**
 * Encrypt a plaintext string.
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded ciphertext (includes IV and auth tag)
 * @throws Error if APP_ENCRYPTION_KEY is not configured
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();

  if (!key) {
    logger.error('[Encryption] APP_ENCRYPTION_KEY not set; cannot encrypt secrets');
    throw new Error('Encryption not configured. Set APP_ENCRYPTION_KEY environment variable.');
  }

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext and encode as base64
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext string.
 *
 * @param ciphertext - Base64-encoded ciphertext (from encryptSecret)
 * @returns Decrypted plaintext string
 * @throws Error if APP_ENCRYPTION_KEY is not configured or decryption fails
 */
export function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey();

  if (!key) {
    logger.error('[Encryption] APP_ENCRYPTION_KEY not set; cannot decrypt secrets');
    throw new Error('Encryption not configured. Set APP_ENCRYPTION_KEY environment variable.');
  }

  try {
    // Decode base64
    const combined = Buffer.from(ciphertext, 'base64');

    // Minimum length check: IV + authTag + at least 1 byte
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      throw new Error('Invalid ciphertext: too short');
    }

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Log error but don't expose details
    logger.error('[Encryption] Decryption failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new Error('Failed to decrypt secret');
  }
}

/**
 * SECURITY FIX (H10): Validate encryption configuration at startup.
 *
 * In production/staging environments, this function will throw an error
 * if APP_ENCRYPTION_KEY is not properly configured, preventing the server
 * from starting with insecure configuration.
 *
 * In development, it logs a warning but allows the server to start.
 *
 * Call this at server startup (e.g., in index.ts).
 *
 * @throws Error if production/staging and encryption key is not configured
 */
export function validateEncryptionConfig(): void {
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

  if (!isEncryptionConfigured()) {
    if (isProduction) {
      throw new Error(
        'FATAL: APP_ENCRYPTION_KEY environment variable must be set in production/staging. ' +
        'The key must be a 64-character hex string (32 bytes). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
        'The server cannot start without encryption configured.'
      );
    } else {
      logger.warn(
        '[SECURITY] APP_ENCRYPTION_KEY is not configured. ' +
        'AI settings and other secrets cannot be stored securely. ' +
        'Set APP_ENCRYPTION_KEY in .env for development if you need encryption.'
      );
    }
  } else {
    logger.info('[Encryption] Encryption key configured and validated');
  }
}

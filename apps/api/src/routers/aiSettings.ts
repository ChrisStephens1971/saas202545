/**
 * AI Settings Router
 *
 * Admin-only endpoints for managing global AI configuration.
 * API keys are stored encrypted in the database.
 */

import { router, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import { logger } from '../utils/logger';
import { encryptSecret, decryptSecret, isEncryptionConfigured } from '../utils/encryption';

// Types for ai_settings table
interface AiSettingsRow {
  id: string;
  provider: string;
  api_key_encrypted: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get or create the singleton ai_settings row.
 */
async function getOrCreateAiSettings(): Promise<AiSettingsRow> {
  // Try to get existing settings
  const result = await db.query<AiSettingsRow>(
    'SELECT * FROM ai_settings LIMIT 1'
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create default settings if none exist
  const insertResult = await db.query<AiSettingsRow>(
    `INSERT INTO ai_settings (provider, enabled)
     VALUES ('openai', false)
     ON CONFLICT DO NOTHING
     RETURNING *`
  );

  // Handle race condition: another process might have inserted
  if (insertResult.rows.length === 0) {
    const retryResult = await db.query<AiSettingsRow>(
      'SELECT * FROM ai_settings LIMIT 1'
    );
    if (retryResult.rows.length > 0) {
      return retryResult.rows[0];
    }
    throw new Error('Failed to create AI settings');
  }

  return insertResult.rows[0];
}

export const aiSettingsRouter = router({
  /**
   * Get current AI settings.
   * Returns provider, enabled status, and whether a key is configured.
   * NEVER returns the actual API key.
   */
  get: adminProcedure.query(async () => {
    try {
      const settings = await getOrCreateAiSettings();

      let keyLast4: string | undefined;
      const hasKey = !!settings.api_key_encrypted;

      // Try to decrypt key to get last 4 chars (only if encryption is configured)
      if (hasKey && isEncryptionConfigured()) {
        try {
          const decrypted = decryptSecret(settings.api_key_encrypted!);
          if (decrypted.length >= 4) {
            keyLast4 = decrypted.slice(-4);
          }
        } catch (error) {
          // Key exists but can't decrypt - might be from different encryption key
          logger.warn('[AI Settings] Could not decrypt stored key for display');
        }
      }

      return {
        provider: settings.provider as 'openai',
        enabled: settings.enabled,
        hasKey,
        keyLast4,
      };
    } catch (error) {
      logger.error('[AI Settings] Failed to get settings', { error });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load AI settings',
      });
    }
  }),

  /**
   * Update AI settings.
   * - enabled: Toggle AI features on/off
   * - apiKey: If string, encrypt and store; if null, clear key; if undefined, keep existing
   */
  update: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        apiKey: z.string().min(1).max(500).optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { enabled, apiKey } = input;

      try {
        const settings = await getOrCreateAiSettings();

        let newKeyEncrypted: string | null = settings.api_key_encrypted;
        let newEnabled = enabled;

        // Handle API key changes
        if (apiKey !== undefined) {
          if (apiKey === null) {
            // Explicitly clear the key
            newKeyEncrypted = null;
            newEnabled = false; // Can't enable AI without a key
            logger.info('[AI Settings] API key cleared');
          } else {
            // New key provided - encrypt it
            if (!isEncryptionConfigured()) {
              throw new TRPCError({
                code: 'PRECONDITION_FAILED',
                message: 'Cannot store API key: APP_ENCRYPTION_KEY not configured',
              });
            }
            newKeyEncrypted = encryptSecret(apiKey);
            logger.info('[AI Settings] New API key stored (encrypted)');
          }
        }

        // Can't enable AI without a key
        if (newEnabled && !newKeyEncrypted) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot enable AI without an API key',
          });
        }

        // Update settings
        await db.query(
          `UPDATE ai_settings
           SET enabled = $1, api_key_encrypted = $2, updated_at = NOW()
           WHERE id = $3`,
          [newEnabled, newKeyEncrypted, settings.id]
        );

        logger.info('[AI Settings] Settings updated', { enabled: newEnabled, hasKey: !!newKeyEncrypted });

        // Return updated state (same shape as get)
        let keyLast4: string | undefined;
        if (newKeyEncrypted && isEncryptionConfigured()) {
          try {
            const decrypted = decryptSecret(newKeyEncrypted);
            if (decrypted.length >= 4) {
              keyLast4 = decrypted.slice(-4);
            }
          } catch {
            // Ignore - key just stored, should be decryptable
          }
        }

        return {
          provider: 'openai' as const,
          enabled: newEnabled,
          hasKey: !!newKeyEncrypted,
          keyLast4,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error('[AI Settings] Failed to update settings', { error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update AI settings',
        });
      }
    }),
});

/**
 * User Preferences Router
 *
 * Endpoints for managing per-user settings like UI mode.
 * These preferences are stored on the person record and flow through to the session.
 *
 * See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md for UiMode architecture.
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import { logger } from '../utils/logger';
import { UiMode, DEFAULT_UI_MODE } from '../auth/types';

// Zod schema for UiMode validation
const UiModeSchema = z.enum(['modern', 'accessible']);

export const userPreferencesRouter = router({
  /**
   * Get current user's UI mode preference.
   * Returns the ui_mode from the person record, defaulting to 'accessible'.
   *
   * Note: The person record is linked to the user via user_id (auth0 sub claim).
   * In the future, we might add a direct link via person.auth_user_id or similar.
   */
  getUiMode: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Look up person record by user_id (auth0 id stored on person.auth_user_id or similar)
      // For now, we fall back to searching by id if no auth link exists
      const result = await db.query<{ ui_mode: string | null }>(
        `SELECT ui_mode FROM person
         WHERE tenant_id = $1 AND deleted_at IS NULL
         AND (id = $2 OR id = $2)
         LIMIT 1`,
        [ctx.tenantId, ctx.userId]
      );

      const uiMode = result.rows[0]?.ui_mode || DEFAULT_UI_MODE;

      return {
        uiMode: uiMode as UiMode,
      };
    } catch (error) {
      logger.error('[User Preferences] Failed to get UI mode', { error, userId: ctx.userId });
      // Return default on error rather than failing
      return {
        uiMode: DEFAULT_UI_MODE,
      };
    }
  }),

  /**
   * Update current user's UI mode preference.
   *
   * Note: This updates the person record in the database.
   * The session/JWT will continue to use the old value until refresh.
   * The frontend UiModeProvider should update its local state immediately.
   *
   * TODO: Consider implementing a session refresh mechanism or using
   * a separate preferences store that doesn't require JWT refresh.
   */
  updateUiMode: protectedProcedure
    .input(
      z.object({
        uiMode: UiModeSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { uiMode } = input;

      try {
        // Update the person record linked to this user
        const result = await db.query(
          `UPDATE person
           SET ui_mode = $1, updated_at = NOW()
           WHERE tenant_id = $2 AND deleted_at IS NULL
           AND id = $3
           RETURNING id`,
          [uiMode, ctx.tenantId, ctx.userId]
        );

        if (result.rowCount === 0) {
          logger.warn('[User Preferences] Person record not found for UI mode update', {
            userId: ctx.userId,
            tenantId: ctx.tenantId,
          });
          // Still return success - the preference will apply on next login
          // when the person record is properly linked
        } else {
          logger.info('[User Preferences] UI mode updated', {
            userId: ctx.userId,
            uiMode,
          });
        }

        return {
          uiMode,
          // Flag indicating client should update local state immediately
          // Session will reflect new value after re-authentication
          persisted: result.rowCount! > 0,
        };
      } catch (error) {
        logger.error('[User Preferences] Failed to update UI mode', { error, userId: ctx.userId });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update UI mode preference',
        });
      }
    }),
});

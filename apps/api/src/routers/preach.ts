import { router, viewerProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger';
import { pgCountToNumber, pgDecimalToNumber } from '../lib/dbNumeric';

// ============================================================================
// Types
// ============================================================================

interface PreachSession {
  id: string;
  tenant_id: string;
  bulletin_issue_id: string;
  started_at: Date;
  ended_at: Date | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TimingWithServiceItem {
  timing_id: string;
  service_item_id: string;
  timing_started_at: Date | null;
  timing_ended_at: Date | null;
  duration_seconds: number | null;
  type: string;
  title: string | null;
  sequence: number;
  duration_minutes: number | null;
  section: string | null;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Verify the user has access to the bulletin (via tenant context)
 */
async function verifyBulletinAccess(
  tenantId: string,
  bulletinIssueId: string
): Promise<boolean> {
  const result = await queryWithTenant<{ id: string }>(
    tenantId,
    `SELECT id FROM bulletin_issue WHERE id = $1 AND deleted_at IS NULL`,
    [bulletinIssueId]
  );
  return result.rows.length > 0;
}

/**
 * Verify the session belongs to the user's tenant
 */
async function getSessionWithAccess(
  tenantId: string,
  sessionId: string
): Promise<PreachSession | null> {
  const result = await queryWithTenant<PreachSession>(
    tenantId,
    `SELECT * FROM preach_session WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

// ============================================================================
// Router
// ============================================================================

export const preachRouter = router({
  /**
   * Start a new preach session
   * Creates a session record for timing analytics
   */
  startSession: viewerProcedure
    .input(
      z.object({
        bulletinIssueId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { bulletinIssueId } = input;
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId;

      // Verify bulletin access
      const hasAccess = await verifyBulletinAccess(tenantId, bulletinIssueId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      // Create the session
      const result = await queryWithTenant<PreachSession>(
        tenantId,
        `INSERT INTO preach_session (tenant_id, bulletin_issue_id, created_by_user_id, started_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [tenantId, bulletinIssueId, userId || null]
      );

      const session = result.rows[0];

      logger.info('Preach session started', {
        sessionId: session.id,
        bulletinIssueId,
        userId,
        tenantId,
      });

      return {
        sessionId: session.id,
        startedAt: session.started_at,
      };
    }),

  /**
   * End a preach session
   * Marks the session as complete (idempotent)
   */
  endSession: viewerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId } = input;
      const tenantId = ctx.tenantId!;

      // Verify session exists and user has access
      const session = await getSessionWithAccess(tenantId, sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Already ended - idempotent
      if (session.ended_at) {
        return {
          sessionId: session.id,
          endedAt: session.ended_at,
          alreadyEnded: true,
        };
      }

      // End the session
      const result = await queryWithTenant<PreachSession>(
        tenantId,
        `UPDATE preach_session
         SET ended_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId]
      );

      const updatedSession = result.rows[0];

      logger.info('Preach session ended', {
        sessionId,
        tenantId,
        duration: updatedSession.ended_at && updatedSession.started_at
          ? Math.round((updatedSession.ended_at.getTime() - updatedSession.started_at.getTime()) / 1000)
          : null,
      });

      return {
        sessionId: updatedSession.id,
        endedAt: updatedSession.ended_at,
        alreadyEnded: false,
      };
    }),

  /**
   * Record item timing (start or end)
   * Idempotent - safe to call multiple times
   */
  recordItemTiming: viewerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        serviceItemId: z.string().uuid(),
        event: z.enum(['start', 'end']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, serviceItemId, event } = input;
      const tenantId = ctx.tenantId!;

      // Verify session exists and user has access
      const session = await getSessionWithAccess(tenantId, sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Verify service item exists within tenant
      const itemResult = await queryWithTenant<{ id: string }>(
        tenantId,
        `SELECT id FROM service_item WHERE id = $1 AND deleted_at IS NULL`,
        [serviceItemId]
      );
      if (itemResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service item not found',
        });
      }

      if (event === 'start') {
        // Upsert timing record with start time (don't overwrite if already set)
        await queryWithTenant(
          tenantId,
          `INSERT INTO service_item_timing (tenant_id, preach_session_id, service_item_id, started_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (preach_session_id, service_item_id)
           DO UPDATE SET
             started_at = COALESCE(service_item_timing.started_at, NOW()),
             updated_at = NOW()`,
          [tenantId, sessionId, serviceItemId]
        );
      } else {
        // event === 'end'
        // Upsert timing record with end time (don't overwrite if already set)
        // duration_seconds is computed by trigger
        await queryWithTenant(
          tenantId,
          `INSERT INTO service_item_timing (tenant_id, preach_session_id, service_item_id, ended_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (preach_session_id, service_item_id)
           DO UPDATE SET
             ended_at = COALESCE(service_item_timing.ended_at, NOW()),
             updated_at = NOW()`,
          [tenantId, sessionId, serviceItemId]
        );
      }

      logger.debug('Item timing recorded', {
        sessionId,
        serviceItemId,
        event,
        tenantId,
      });

      return { success: true };
    }),

  /**
   * Get session summary with all timings
   * Used for analytics view
   */
  getSessionSummary: viewerProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { sessionId } = input;
      const tenantId = ctx.tenantId!;

      // Get session with bulletin info
      const sessionResult = await queryWithTenant<PreachSession & { issue_date: Date }>(
        tenantId,
        `SELECT ps.*, bi.issue_date
         FROM preach_session ps
         JOIN bulletin_issue bi ON bi.id = ps.bulletin_issue_id
         WHERE ps.id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      const session = sessionResult.rows[0];

      // Get all timings for this session joined with service items
      const timingsResult = await queryWithTenant<TimingWithServiceItem>(
        tenantId,
        `SELECT
           sit.id as timing_id,
           sit.service_item_id,
           sit.started_at as timing_started_at,
           sit.ended_at as timing_ended_at,
           sit.duration_seconds,
           si.type,
           si.title,
           si.sequence,
           si.duration_minutes,
           si.section
         FROM service_item_timing sit
         JOIN service_item si ON si.id = sit.service_item_id
         WHERE sit.preach_session_id = $1
         ORDER BY si.sequence ASC`,
        [sessionId]
      );

      // Calculate totals
      let totalPlannedSeconds = 0;
      let totalActualSeconds = 0;

      const items = timingsResult.rows.map((row) => {
        const plannedSeconds = (row.duration_minutes || 0) * 60;
        const actualSeconds = row.duration_seconds || 0;

        totalPlannedSeconds += plannedSeconds;
        totalActualSeconds += actualSeconds;

        return {
          serviceItemId: row.service_item_id,
          type: row.type,
          title: row.title,
          sequence: row.sequence,
          section: row.section,
          plannedDurationMinutes: row.duration_minutes,
          plannedDurationSeconds: plannedSeconds,
          actualDurationSeconds: actualSeconds,
          startedAt: row.timing_started_at,
          endedAt: row.timing_ended_at,
          difference: actualSeconds - plannedSeconds,
        };
      });

      // Compute session duration
      const sessionDurationSeconds = session.ended_at && session.started_at
        ? Math.round((session.ended_at.getTime() - session.started_at.getTime()) / 1000)
        : null;

      return {
        session: {
          id: session.id,
          bulletinIssueId: session.bulletin_issue_id,
          issueDate: session.issue_date,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          durationSeconds: sessionDurationSeconds,
          createdByUserId: session.created_by_user_id,
        },
        items,
        totals: {
          plannedSeconds: totalPlannedSeconds,
          plannedMinutes: Math.round(totalPlannedSeconds / 60),
          actualSeconds: totalActualSeconds,
          actualMinutes: Math.round(totalActualSeconds / 60),
          differenceSeconds: totalActualSeconds - totalPlannedSeconds,
          differenceMinutes: Math.round((totalActualSeconds - totalPlannedSeconds) / 60),
        },
      };
    }),

  /**
   * List all sessions for a bulletin
   * Used for analytics page to show session history
   */
  listSessions: viewerProcedure
    .input(
      z.object({
        bulletinIssueId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { bulletinIssueId } = input;
      const tenantId = ctx.tenantId!;

      // Verify bulletin access
      const hasAccess = await verifyBulletinAccess(tenantId, bulletinIssueId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      // Get sessions with timing summary
      const result = await queryWithTenant<
        PreachSession & {
          total_items: string;
          total_actual_seconds: string | null;
        }
      >(
        tenantId,
        `SELECT
           ps.*,
           COUNT(sit.id) as total_items,
           SUM(sit.duration_seconds) as total_actual_seconds
         FROM preach_session ps
         LEFT JOIN service_item_timing sit ON sit.preach_session_id = ps.id
         WHERE ps.bulletin_issue_id = $1
         GROUP BY ps.id
         ORDER BY ps.started_at DESC`,
        [bulletinIssueId]
      );

      // Get total planned duration from service items for this bulletin date
      const bulletinResult = await queryWithTenant<{ issue_date: Date }>(
        tenantId,
        `SELECT issue_date FROM bulletin_issue WHERE id = $1`,
        [bulletinIssueId]
      );

      let totalPlannedMinutes = 0;
      if (bulletinResult.rows.length > 0) {
        const plannedResult = await queryWithTenant<{ total_minutes: string }>(
          tenantId,
          `SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
           FROM service_item
           WHERE service_date = $1 AND deleted_at IS NULL`,
          [bulletinResult.rows[0].issue_date]
        );
        totalPlannedMinutes = pgCountToNumber(plannedResult.rows[0]?.total_minutes);
      }

      return {
        sessions: result.rows.map((session) => ({
          id: session.id,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          createdByUserId: session.created_by_user_id,
          totalItems: pgCountToNumber(session.total_items),
          totalActualSeconds: session.total_actual_seconds
            ? pgDecimalToNumber(session.total_actual_seconds)
            : null,
          sessionDurationSeconds: session.ended_at && session.started_at
            ? Math.round((session.ended_at.getTime() - session.started_at.getTime()) / 1000)
            : null,
        })),
        totalPlannedMinutes,
      };
    }),
});

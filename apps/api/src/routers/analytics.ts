import { router, viewerProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { logger } from '../utils/logger';
import { pgCountToNumber, pgDecimalToNumber } from '../lib/dbNumeric';

// ============================================================================
// Types
// ============================================================================

interface PreacherStatsRow {
  preacher: string;
  sessions_count: string;
  avg_planned_seconds: string;
  avg_actual_seconds: string;
  avg_delta_seconds: string;
}

interface SeriesStatsRow {
  series_id: string;
  series_title: string;
  sessions_count: string;
  avg_planned_seconds: string;
  avg_actual_seconds: string;
  avg_delta_seconds: string;
}

interface ServiceSlotStatsRow {
  service_slot: string;
  sessions_count: string;
  avg_planned_seconds: string;
  avg_actual_seconds: string;
  avg_delta_seconds: string;
}

interface SessionDetailRow {
  session_id: string;
  bulletin_issue_id: string;
  issue_date: Date;
  started_at: Date;
  ended_at: Date | null;
  service_slot: string;
  preacher: string | null;
  series_id: string | null;
  series_title: string | null;
  sermon_title: string | null;
  planned_seconds: string;
  actual_seconds: string;
  delta_seconds: string;
}

interface OverviewStatsRow {
  sessions_count: string;
  avg_planned_seconds: string;
  avg_actual_seconds: string;
  avg_delta_seconds: string;
}

// ============================================================================
// Common Input Schema
// ============================================================================

const analyticsFilterInput = z.object({
  from: z.string().optional(), // ISO date string
  to: z.string().optional(), // ISO date string
  seriesId: z.string().uuid().optional(),
  preacherId: z.string().optional(), // preacher name (string)
  serviceSlot: z.string().optional(), // e.g., "09:00", "11:00"
});

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Build date range filter with conservative defaults (last 90 days)
 */
function getDateRangeFilter(from?: string, to?: string): { fromDate: string; toDate: string } {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);

  return {
    fromDate: from || defaultFrom.toISOString().split('T')[0],
    toDate: to || now.toISOString().split('T')[0],
  };
}

/**
 * Format service slot from timestamp (e.g., "09:00", "11:00")
 * Uses the hour from preach_session.started_at to derive service time
 */
function getServiceSlotExpression(): string {
  // Extract hour:minute from started_at, rounded to nearest hour for grouping
  return `TO_CHAR(ps.started_at AT TIME ZONE 'UTC', 'HH24:00')`;
}

// ============================================================================
// Router
// ============================================================================

export const analyticsRouter = router({
  /**
   * Get overview stats for the dashboard
   * Returns aggregate counts and averages for the filtered period
   */
  getOverview: viewerProcedure
    .input(analyticsFilterInput)
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const { fromDate, toDate } = getDateRangeFilter(input.from, input.to);

      logger.debug('Analytics getOverview', { tenantId, fromDate, toDate, input });

      // Build dynamic WHERE clauses based on filters
      const conditions: string[] = [
        'ps.ended_at IS NOT NULL', // Only completed sessions
        'bi.issue_date >= $2',
        'bi.issue_date <= $3',
      ];
      const params: (string | null)[] = [tenantId, fromDate, toDate];
      let paramIndex = 4;

      if (input.seriesId) {
        conditions.push(`s.series_id = $${paramIndex}`);
        params.push(input.seriesId);
        paramIndex++;
      }

      if (input.preacherId) {
        conditions.push(`s.preacher = $${paramIndex}`);
        params.push(input.preacherId);
        paramIndex++;
      }

      if (input.serviceSlot) {
        conditions.push(`${getServiceSlotExpression()} = $${paramIndex}`);
        params.push(input.serviceSlot);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const result = await queryWithTenant<OverviewStatsRow>(
        tenantId,
        `WITH session_stats AS (
          SELECT
            ps.id as session_id,
            COALESCE(SUM(si.duration_minutes * 60), 0) as planned_seconds,
            COALESCE(SUM(sit.duration_seconds), 0) as actual_seconds
          FROM preach_session ps
          JOIN bulletin_issue bi ON bi.id = ps.bulletin_issue_id
          LEFT JOIN service_item si ON si.service_date = bi.issue_date AND si.tenant_id = ps.tenant_id AND si.deleted_at IS NULL
          LEFT JOIN service_item_timing sit ON sit.preach_session_id = ps.id AND sit.service_item_id = si.id
          LEFT JOIN sermon s ON s.id = si.sermon_id
          WHERE ${whereClause}
          GROUP BY ps.id
        )
        SELECT
          COUNT(DISTINCT session_id)::text as sessions_count,
          COALESCE(AVG(planned_seconds), 0)::text as avg_planned_seconds,
          COALESCE(AVG(actual_seconds), 0)::text as avg_actual_seconds,
          COALESCE(AVG(actual_seconds - planned_seconds), 0)::text as avg_delta_seconds
        FROM session_stats`,
        params
      );

      const row = result.rows[0] || {
        sessions_count: '0',
        avg_planned_seconds: '0',
        avg_actual_seconds: '0',
        avg_delta_seconds: '0',
      };

      return {
        sessionsCount: pgCountToNumber(row.sessions_count),
        avgPlannedMinutes: Math.round(pgDecimalToNumber(row.avg_planned_seconds) / 60),
        avgActualMinutes: Math.round(pgDecimalToNumber(row.avg_actual_seconds) / 60),
        avgDeltaMinutes: Math.round(pgDecimalToNumber(row.avg_delta_seconds) / 60),
      };
    }),

  /**
   * Get stats grouped by preacher
   * Shows which preachers consistently run over/under time
   */
  getPreacherStats: viewerProcedure
    .input(analyticsFilterInput.omit({ preacherId: true }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const { fromDate, toDate } = getDateRangeFilter(input.from, input.to);

      logger.debug('Analytics getPreacherStats', { tenantId, fromDate, toDate });

      // Build dynamic WHERE clauses
      const conditions: string[] = [
        'ps.ended_at IS NOT NULL',
        'bi.issue_date >= $2',
        'bi.issue_date <= $3',
        's.preacher IS NOT NULL', // Only sessions with sermon preacher
      ];
      const params: (string | null)[] = [tenantId, fromDate, toDate];
      let paramIndex = 4;

      if (input.seriesId) {
        conditions.push(`s.series_id = $${paramIndex}`);
        params.push(input.seriesId);
        paramIndex++;
      }

      if (input.serviceSlot) {
        conditions.push(`${getServiceSlotExpression()} = $${paramIndex}`);
        params.push(input.serviceSlot);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const result = await queryWithTenant<PreacherStatsRow>(
        tenantId,
        `WITH session_preacher_stats AS (
          SELECT
            ps.id as session_id,
            s.preacher,
            COALESCE(SUM(si.duration_minutes * 60), 0) as planned_seconds,
            COALESCE(SUM(sit.duration_seconds), 0) as actual_seconds
          FROM preach_session ps
          JOIN bulletin_issue bi ON bi.id = ps.bulletin_issue_id
          JOIN service_item si ON si.service_date = bi.issue_date AND si.tenant_id = ps.tenant_id AND si.deleted_at IS NULL
          LEFT JOIN service_item_timing sit ON sit.preach_session_id = ps.id AND sit.service_item_id = si.id
          LEFT JOIN sermon s ON s.id = si.sermon_id
          WHERE ${whereClause}
          GROUP BY ps.id, s.preacher
        )
        SELECT
          preacher,
          COUNT(DISTINCT session_id)::text as sessions_count,
          COALESCE(AVG(planned_seconds), 0)::text as avg_planned_seconds,
          COALESCE(AVG(actual_seconds), 0)::text as avg_actual_seconds,
          COALESCE(AVG(actual_seconds - planned_seconds), 0)::text as avg_delta_seconds
        FROM session_preacher_stats
        GROUP BY preacher
        ORDER BY COUNT(DISTINCT session_id) DESC`,
        params
      );

      return {
        preachers: result.rows.map((row) => ({
          preacherId: row.preacher, // Use preacher name as ID since it's a string field
          preacherName: row.preacher,
          sessionsCount: pgCountToNumber(row.sessions_count),
          avgPlannedMinutes: Math.round(pgDecimalToNumber(row.avg_planned_seconds) / 60),
          avgActualMinutes: Math.round(pgDecimalToNumber(row.avg_actual_seconds) / 60),
          avgDeltaMinutes: Math.round(pgDecimalToNumber(row.avg_delta_seconds) / 60),
        })),
      };
    }),

  /**
   * Get stats grouped by sermon series
   * Shows how different series compare in terms of timing
   */
  getSeriesStats: viewerProcedure
    .input(analyticsFilterInput.omit({ seriesId: true }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const { fromDate, toDate } = getDateRangeFilter(input.from, input.to);

      logger.debug('Analytics getSeriesStats', { tenantId, fromDate, toDate });

      // Build dynamic WHERE clauses
      const conditions: string[] = [
        'ps.ended_at IS NOT NULL',
        'bi.issue_date >= $2',
        'bi.issue_date <= $3',
        's.series_id IS NOT NULL', // Only sessions with sermon in a series
      ];
      const params: (string | null)[] = [tenantId, fromDate, toDate];
      let paramIndex = 4;

      if (input.preacherId) {
        conditions.push(`s.preacher = $${paramIndex}`);
        params.push(input.preacherId);
        paramIndex++;
      }

      if (input.serviceSlot) {
        conditions.push(`${getServiceSlotExpression()} = $${paramIndex}`);
        params.push(input.serviceSlot);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const result = await queryWithTenant<SeriesStatsRow>(
        tenantId,
        `WITH session_series_stats AS (
          SELECT
            ps.id as session_id,
            s.series_id,
            ss.title as series_title,
            COALESCE(SUM(si.duration_minutes * 60), 0) as planned_seconds,
            COALESCE(SUM(sit.duration_seconds), 0) as actual_seconds
          FROM preach_session ps
          JOIN bulletin_issue bi ON bi.id = ps.bulletin_issue_id
          JOIN service_item si ON si.service_date = bi.issue_date AND si.tenant_id = ps.tenant_id AND si.deleted_at IS NULL
          LEFT JOIN service_item_timing sit ON sit.preach_session_id = ps.id AND sit.service_item_id = si.id
          JOIN sermon s ON s.id = si.sermon_id
          JOIN sermon_series ss ON ss.id = s.series_id
          WHERE ${whereClause}
          GROUP BY ps.id, s.series_id, ss.title
        )
        SELECT
          series_id::text,
          series_title,
          COUNT(DISTINCT session_id)::text as sessions_count,
          COALESCE(AVG(planned_seconds), 0)::text as avg_planned_seconds,
          COALESCE(AVG(actual_seconds), 0)::text as avg_actual_seconds,
          COALESCE(AVG(actual_seconds - planned_seconds), 0)::text as avg_delta_seconds
        FROM session_series_stats
        GROUP BY series_id, series_title
        ORDER BY COUNT(DISTINCT session_id) DESC`,
        params
      );

      return {
        series: result.rows.map((row) => ({
          seriesId: row.series_id,
          seriesName: row.series_title,
          sessionsCount: pgCountToNumber(row.sessions_count),
          avgPlannedMinutes: Math.round(pgDecimalToNumber(row.avg_planned_seconds) / 60),
          avgActualMinutes: Math.round(pgDecimalToNumber(row.avg_actual_seconds) / 60),
          avgDeltaMinutes: Math.round(pgDecimalToNumber(row.avg_delta_seconds) / 60),
        })),
      };
    }),

  /**
   * Get stats grouped by service time slot
   * Shows if 9am vs 11am services consistently differ in timing
   */
  getServiceTimeStats: viewerProcedure
    .input(analyticsFilterInput.omit({ serviceSlot: true }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const { fromDate, toDate } = getDateRangeFilter(input.from, input.to);

      logger.debug('Analytics getServiceTimeStats', { tenantId, fromDate, toDate });

      // Build dynamic WHERE clauses
      const conditions: string[] = [
        'ps.ended_at IS NOT NULL',
        'bi.issue_date >= $2',
        'bi.issue_date <= $3',
      ];
      const params: (string | null)[] = [tenantId, fromDate, toDate];
      let paramIndex = 4;

      if (input.seriesId) {
        conditions.push(`s.series_id = $${paramIndex}`);
        params.push(input.seriesId);
        paramIndex++;
      }

      if (input.preacherId) {
        conditions.push(`s.preacher = $${paramIndex}`);
        params.push(input.preacherId);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const serviceSlotExpr = getServiceSlotExpression();

      const result = await queryWithTenant<ServiceSlotStatsRow>(
        tenantId,
        `WITH session_slot_stats AS (
          SELECT
            ps.id as session_id,
            ${serviceSlotExpr} as service_slot,
            COALESCE(SUM(si.duration_minutes * 60), 0) as planned_seconds,
            COALESCE(SUM(sit.duration_seconds), 0) as actual_seconds
          FROM preach_session ps
          JOIN bulletin_issue bi ON bi.id = ps.bulletin_issue_id
          LEFT JOIN service_item si ON si.service_date = bi.issue_date AND si.tenant_id = ps.tenant_id AND si.deleted_at IS NULL
          LEFT JOIN service_item_timing sit ON sit.preach_session_id = ps.id AND sit.service_item_id = si.id
          LEFT JOIN sermon s ON s.id = si.sermon_id
          WHERE ${whereClause}
          GROUP BY ps.id, ${serviceSlotExpr}
        )
        SELECT
          service_slot,
          COUNT(DISTINCT session_id)::text as sessions_count,
          COALESCE(AVG(planned_seconds), 0)::text as avg_planned_seconds,
          COALESCE(AVG(actual_seconds), 0)::text as avg_actual_seconds,
          COALESCE(AVG(actual_seconds - planned_seconds), 0)::text as avg_delta_seconds
        FROM session_slot_stats
        GROUP BY service_slot
        ORDER BY service_slot`,
        params
      );

      return {
        serviceSlots: result.rows.map((row) => ({
          serviceSlot: row.service_slot,
          sessionsCount: pgCountToNumber(row.sessions_count),
          avgPlannedMinutes: Math.round(pgDecimalToNumber(row.avg_planned_seconds) / 60),
          avgActualMinutes: Math.round(pgDecimalToNumber(row.avg_actual_seconds) / 60),
          avgDeltaMinutes: Math.round(pgDecimalToNumber(row.avg_delta_seconds) / 60),
        })),
      };
    }),

  /**
   * Get detailed list of sessions matching a specific filter
   * Used for drill-down from chart/table rows
   */
  getDetailForFilter: viewerProcedure
    .input(
      z.object({
        type: z.enum(['preacher', 'series', 'serviceSlot']),
        idOrKey: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const { fromDate, toDate } = getDateRangeFilter(input.from, input.to);
      const { type, idOrKey } = input;

      logger.debug('Analytics getDetailForFilter', { tenantId, type, idOrKey, fromDate, toDate });

      // Build filter based on type
      const conditions: string[] = [
        'ps.ended_at IS NOT NULL',
        'bi.issue_date >= $2',
        'bi.issue_date <= $3',
      ];
      const params: (string | null)[] = [tenantId, fromDate, toDate];

      if (type === 'preacher') {
        conditions.push('s.preacher = $4');
        params.push(idOrKey);
      } else if (type === 'series') {
        conditions.push('s.series_id = $4');
        params.push(idOrKey);
      } else if (type === 'serviceSlot') {
        conditions.push(`${getServiceSlotExpression()} = $4`);
        params.push(idOrKey);
      }

      const whereClause = conditions.join(' AND ');
      const serviceSlotExpr = getServiceSlotExpression();

      const result = await queryWithTenant<SessionDetailRow>(
        tenantId,
        `SELECT
          ps.id as session_id,
          ps.bulletin_issue_id,
          bi.issue_date,
          ps.started_at,
          ps.ended_at,
          ${serviceSlotExpr} as service_slot,
          s.preacher,
          s.series_id::text,
          ss.title as series_title,
          s.title as sermon_title,
          COALESCE((
            SELECT SUM(si2.duration_minutes * 60)
            FROM service_item si2
            WHERE si2.service_date = bi.issue_date
              AND si2.tenant_id = ps.tenant_id
              AND si2.deleted_at IS NULL
          ), 0)::text as planned_seconds,
          COALESCE((
            SELECT SUM(sit2.duration_seconds)
            FROM service_item_timing sit2
            WHERE sit2.preach_session_id = ps.id
          ), 0)::text as actual_seconds,
          COALESCE((
            SELECT SUM(sit2.duration_seconds)
            FROM service_item_timing sit2
            WHERE sit2.preach_session_id = ps.id
          ), 0) - COALESCE((
            SELECT SUM(si2.duration_minutes * 60)
            FROM service_item si2
            WHERE si2.service_date = bi.issue_date
              AND si2.tenant_id = ps.tenant_id
              AND si2.deleted_at IS NULL
          ), 0) as delta_seconds
        FROM preach_session ps
        JOIN bulletin_issue bi ON bi.id = ps.bulletin_issue_id
        LEFT JOIN service_item si ON si.service_date = bi.issue_date
          AND si.tenant_id = ps.tenant_id
          AND si.deleted_at IS NULL
          AND si.type = 'Sermon'
        LEFT JOIN sermon s ON s.id = si.sermon_id
        LEFT JOIN sermon_series ss ON ss.id = s.series_id
        WHERE ${whereClause}
        GROUP BY ps.id, ps.bulletin_issue_id, bi.issue_date, ps.started_at, ps.ended_at,
                 s.preacher, s.series_id, ss.title, s.title
        ORDER BY ps.started_at DESC`,
        params
      );

      return {
        sessions: result.rows.map((row) => ({
          sessionId: row.session_id,
          bulletinIssueId: row.bulletin_issue_id,
          issueDate: row.issue_date,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          serviceSlot: row.service_slot,
          preacher: row.preacher,
          seriesId: row.series_id,
          seriesName: row.series_title,
          sermonTitle: row.sermon_title,
          plannedMinutes: Math.round(pgDecimalToNumber(row.planned_seconds) / 60),
          actualMinutes: Math.round(pgDecimalToNumber(row.actual_seconds) / 60),
          deltaMinutes: Math.round(pgDecimalToNumber(row.delta_seconds) / 60),
        })),
      };
    }),

  /**
   * Get list of all preachers for filter dropdown
   */
  getPreachers: viewerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;

    const result = await queryWithTenant<{ preacher: string }>(
      tenantId,
      `SELECT DISTINCT s.preacher
       FROM sermon s
       WHERE s.tenant_id = $1
         AND s.preacher IS NOT NULL
         AND s.deleted_at IS NULL
       ORDER BY s.preacher`,
      [tenantId]
    );

    return {
      preachers: result.rows.map((row) => ({
        id: row.preacher,
        name: row.preacher,
      })),
    };
  }),

  /**
   * Get list of all series for filter dropdown
   */
  getSeries: viewerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;

    const result = await queryWithTenant<{ id: string; title: string }>(
      tenantId,
      `SELECT id::text, title
       FROM sermon_series
       WHERE tenant_id = $1
         AND deleted_at IS NULL
       ORDER BY COALESCE(start_date, created_at) DESC`,
      [tenantId]
    );

    return {
      series: result.rows.map((row) => ({
        id: row.id,
        name: row.title,
      })),
    };
  }),

  /**
   * Get list of unique service slots for filter dropdown
   */
  getServiceSlots: viewerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;
    const serviceSlotExpr = getServiceSlotExpression();

    const result = await queryWithTenant<{ service_slot: string }>(
      tenantId,
      `SELECT DISTINCT ${serviceSlotExpr} as service_slot
       FROM preach_session ps
       WHERE ps.tenant_id = $1
         AND ps.ended_at IS NOT NULL
       ORDER BY service_slot`,
      [tenantId]
    );

    return {
      serviceSlots: result.rows.map((row) => ({
        id: row.service_slot,
        name: row.service_slot,
      })),
    };
  }),
});

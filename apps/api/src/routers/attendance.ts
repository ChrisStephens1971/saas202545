import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';

/** Database row type for attendance session with joined event/group */
export interface AttendanceSessionRow {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  event_id: string | null;
  group_id: string | null;
  session_date: string;
  session_time: string | null;
  total_count: number;
  member_count: number;
  visitor_count: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  event_title: string | null;
  group_name: string | null;
}

/** Database row type for attendance record with joined person info */
export interface AttendanceRecordRow {
  id: string;
  person_id: string;
  guest_count: number;
  notes: string | null;
  checked_in_at: Date;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  photo_url: string | null;
  membership_status: string | null;
  checked_in_by_first_name: string | null;
  checked_in_by_last_name: string | null;
}

export const attendanceRouter = router({
  listSessions: protectedProcedure
    .input(
      z.object({
        category: z.enum(['SundayService', 'SmallGroup', 'Event', 'Class', 'Meeting', 'Other']).optional(),
        eventId: z.string().uuid().optional(),
        groupId: z.string().uuid().optional(),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { category, eventId, groupId, startDate, endDate, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          ats.*,
          e.title as event_title,
          g.name as group_name
        FROM attendance_session ats
        LEFT JOIN event e ON ats.event_id = e.id
        LEFT JOIN "group" g ON ats.group_id = g.id
        WHERE ats.deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (category) {
        queryParams.push(category);
        queryText += ` AND ats.category = $${queryParams.length}`;
      }

      if (eventId) {
        queryParams.push(eventId);
        queryText += ` AND ats.event_id = $${queryParams.length}`;
      }

      if (groupId) {
        queryParams.push(groupId);
        queryText += ` AND ats.group_id = $${queryParams.length}`;
      }

      if (startDate) {
        queryParams.push(startDate);
        queryText += ` AND ats.session_date >= $${queryParams.length}`;
      }

      if (endDate) {
        queryParams.push(endDate);
        queryText += ` AND ats.session_date <= $${queryParams.length}`;
      }

      queryText += ` ORDER BY ats.session_date DESC, ats.session_time DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant<AttendanceSessionRow>(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM attendance_session
        WHERE deleted_at IS NULL
        ${category ? `AND category = $1` : ''}
        ${eventId ? `AND event_id = $${category ? 2 : 1}` : ''}
        ${groupId ? `AND group_id = $${[category, eventId].filter(Boolean).length + 1}` : ''}
        ${startDate ? `AND session_date >= $${[category, eventId, groupId].filter(Boolean).length + 1}` : ''}
        ${endDate ? `AND session_date <= $${[category, eventId, groupId, startDate].filter(Boolean).length + 1}` : ''}
      `;
      const countParams = [category, eventId, groupId, startDate, endDate].filter(Boolean);
      const countResult = await queryWithTenant<{ total: string }>(tenantId, countQuery, countParams);

      return {
        sessions: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  getSession: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const sessionResult = await queryWithTenant<AttendanceSessionRow>(
        tenantId,
        `SELECT
          ats.*,
          e.title as event_title,
          g.name as group_name
        FROM attendance_session ats
        LEFT JOIN event e ON ats.event_id = e.id
        LEFT JOIN "group" g ON ats.group_id = g.id
        WHERE ats.id = $1 AND ats.deleted_at IS NULL`,
        [id]
      );

      if (sessionResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance session not found' });
      }

      const recordsResult = await queryWithTenant<AttendanceRecordRow>(
        tenantId,
        `SELECT
          ar.id,
          ar.person_id,
          ar.guest_count,
          ar.notes,
          ar.checked_in_at,
          p.first_name,
          p.last_name,
          p.email,
          p.photo_url,
          p.membership_status,
          checker.first_name as checked_in_by_first_name,
          checker.last_name as checked_in_by_last_name
        FROM attendance_record ar
        JOIN person p ON ar.person_id = p.id
        LEFT JOIN person checker ON ar.checked_in_by = checker.id
        WHERE ar.session_id = $1
        ORDER BY ar.checked_in_at DESC`,
        [id]
      );

      return {
        ...sessionResult.rows[0],
        records: recordsResult.rows,
      };
    }),

  createSession: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        category: z.enum(['SundayService', 'SmallGroup', 'Event', 'Class', 'Meeting', 'Other']),
        eventId: z.string().uuid().optional(),
        groupId: z.string().uuid().optional(),
        sessionDate: z.string(), // ISO date string
        sessionTime: z.string().optional(), // HH:MM format
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO attendance_session (
          tenant_id, name, category, event_id, group_id, session_date, session_time, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          tenantId,
          input.name,
          input.category,
          input.eventId || null,
          input.groupId || null,
          input.sessionDate,
          input.sessionTime || null,
          ctx.userId || null,
        ]
      );

      return result.rows[0];
    }),

  updateSession: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        category: z.enum(['SundayService', 'SmallGroup', 'Event', 'Class', 'Meeting', 'Other']).optional(),
        eventId: z.string().uuid().optional(),
        groupId: z.string().uuid().optional(),
        sessionDate: z.string().optional(),
        sessionTime: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: QueryParam[] = [id];
      let paramIndex = 2;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant(
        tenantId,
        `UPDATE attendance_session
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance session not found' });
      }

      return result.rows[0];
    }),

  deleteSession: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE attendance_session
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance session not found' });
      }

      return { success: true };
    }),

  checkIn: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        personId: z.string().uuid(),
        guestCount: z.number().int().min(0).default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      try {
        const result = await queryWithTenant(
          tenantId,
          `INSERT INTO attendance_record (tenant_id, session_id, person_id, guest_count, notes, checked_in_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            tenantId,
            input.sessionId,
            input.personId,
            input.guestCount,
            input.notes || null,
            ctx.userId || null,
          ]
        );

        return result.rows[0];
      } catch (error: unknown) {
        // PostgreSQL error with code property for constraint violations
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
          // Unique constraint violation
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Person already checked in to this session',
          });
        }
        throw error;
      }
    }),

  checkOut: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        personId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `DELETE FROM attendance_record
        WHERE session_id = $1 AND person_id = $2
        RETURNING id`,
        [input.sessionId, input.personId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance record not found' });
      }

      return { success: true };
    }),

  getStats: protectedProcedure
    .input(
      z.object({
        category: z.enum(['SundayService', 'SmallGroup', 'Event', 'Class', 'Meeting', 'Other']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { category, startDate, endDate } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          COUNT(*) as session_count,
          SUM(total_count) as total_attendance,
          SUM(member_count) as total_members,
          SUM(visitor_count) as total_visitors,
          ROUND(AVG(total_count)) as avg_attendance
        FROM attendance_session
        WHERE deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (category) {
        queryParams.push(category);
        queryText += ` AND category = $${queryParams.length}`;
      }

      if (startDate) {
        queryParams.push(startDate);
        queryText += ` AND session_date >= $${queryParams.length}`;
      }

      if (endDate) {
        queryParams.push(endDate);
        queryText += ` AND session_date <= $${queryParams.length}`;
      }

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      return result.rows[0];
    }),
});

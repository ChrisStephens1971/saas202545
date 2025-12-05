import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';

interface Event {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  start_at: Date;
  end_at: Date | null;
  all_day: boolean;
  location_name: string | null;
  location_address: string | null;
  is_public: boolean;
  allow_rsvp: boolean;
  rsvp_limit: number | null;
  external_calendar_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const eventsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, limit } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          id,
          tenant_id,
          title,
          description,
          start_at,
          end_at,
          all_day,
          location_name,
          location_address,
          is_public,
          allow_rsvp,
          rsvp_limit,
          created_at,
          updated_at
        FROM event
        WHERE deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (startDate) {
        queryParams.push(new Date(startDate));
        queryText += ` AND start_at >= $${queryParams.length}`;
      }

      if (endDate) {
        queryParams.push(new Date(endDate));
        queryText += ` AND start_at <= $${queryParams.length}`;
      }

      queryText += ` ORDER BY start_at ASC LIMIT $${queryParams.length + 1}`;
      queryParams.push(limit);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM event
        WHERE deleted_at IS NULL
        ${startDate ? `AND start_at >= $1` : ''}
        ${endDate ? `AND start_at <= $${startDate ? '2' : '1'}` : ''}
      `;

      const countParams: QueryParam[] = [];
      if (startDate) countParams.push(new Date(startDate));
      if (endDate) countParams.push(new Date(endDate));

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant<Event>(tenantId, queryText, queryParams),
        queryWithTenant<{ total: string }>(tenantId, countQuery, countParams),
      ]);

      return {
        events: dataResult.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          title: row.title,
          description: row.description,
          startAt: row.start_at,
          endAt: row.end_at,
          allDay: row.all_day,
          locationName: row.location_name,
          locationAddress: row.location_address,
          isPublic: row.is_public,
          allowRsvp: row.allow_rsvp,
          rsvpLimit: row.rsvp_limit,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const queryText = `
        SELECT
          id,
          tenant_id,
          title,
          description,
          start_at,
          end_at,
          all_day,
          location_name,
          location_address,
          is_public,
          allow_rsvp,
          rsvp_limit,
          created_at,
          updated_at
        FROM event
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await queryWithTenant<Event>(tenantId, queryText, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        title: row.title,
        description: row.description,
        startAt: row.start_at,
        endAt: row.end_at,
        allDay: row.all_day,
        locationName: row.location_name,
        locationAddress: row.location_address,
        isPublic: row.is_public,
        allowRsvp: row.allow_rsvp,
        rsvpLimit: row.rsvp_limit,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime().optional(),
        allDay: z.boolean().default(false),
        locationName: z.string().optional(),
        locationAddress: z.string().optional(),
        isPublic: z.boolean().default(true),
        allowRsvp: z.boolean().default(true),
        rsvpLimit: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const insertQuery = `
        INSERT INTO event (
          tenant_id,
          title,
          description,
          start_at,
          end_at,
          all_day,
          location_name,
          location_address,
          is_public,
          allow_rsvp,
          rsvp_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          tenant_id,
          title,
          description,
          start_at,
          end_at,
          all_day,
          location_name,
          location_address,
          is_public,
          allow_rsvp,
          rsvp_limit,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<Event>(tenantId, insertQuery, [
        tenantId,
        input.title,
        input.description || null,
        new Date(input.startAt),
        input.endAt ? new Date(input.endAt) : null,
        input.allDay,
        input.locationName || null,
        input.locationAddress || null,
        input.isPublic,
        input.allowRsvp,
        input.rsvpLimit || null,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        title: row.title,
        description: row.description,
        startAt: row.start_at,
        endAt: row.end_at,
        allDay: row.all_day,
        locationName: row.location_name,
        locationAddress: row.location_address,
        isPublic: row.is_public,
        allowRsvp: row.allow_rsvp,
        rsvpLimit: row.rsvp_limit,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        allDay: z.boolean().optional(),
        locationName: z.string().optional(),
        locationAddress: z.string().optional(),
        isPublic: z.boolean().optional(),
        allowRsvp: z.boolean().optional(),
        rsvpLimit: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if event exists
      const existsQuery = `
        SELECT id FROM event
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const exists = await queryWithTenant(tenantId, existsQuery, [input.id]);

      if (exists.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      const updateQuery = `
        UPDATE event
        SET title = COALESCE($2, title),
            description = COALESCE($3, description),
            start_at = COALESCE($4, start_at),
            end_at = COALESCE($5, end_at),
            all_day = COALESCE($6, all_day),
            location_name = COALESCE($7, location_name),
            location_address = COALESCE($8, location_address),
            is_public = COALESCE($9, is_public),
            allow_rsvp = COALESCE($10, allow_rsvp),
            rsvp_limit = COALESCE($11, rsvp_limit),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(tenantId, updateQuery, [
        input.id,
        input.title,
        input.description,
        input.startAt ? new Date(input.startAt) : null,
        input.endAt ? new Date(input.endAt) : null,
        input.allDay,
        input.locationName,
        input.locationAddress,
        input.isPublic,
        input.allowRsvp,
        input.rsvpLimit,
      ]);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const deleteQuery = `
        UPDATE event
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, deleteQuery, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      return { success: true };
    }),
});

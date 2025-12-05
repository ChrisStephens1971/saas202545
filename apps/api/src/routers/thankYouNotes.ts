import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';

export interface ThankYouNote {
  id: string;
  tenant_id: string;
  person_id: string;
  donation_id: string | null;
  event_id: string | null;
  note_date: Date;
  channel: string;
  subject: string | null;
  body: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const ChannelSchema = z.enum(['Card', 'Email', 'Text', 'Call', 'In-Person']);

export const thankYouNotesRouter = router({
  // ============================================================================
  // THANK-YOU NOTES
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid().optional(),
        donationId: z.string().uuid().optional(),
        eventId: z.string().uuid().optional(),
        channel: ChannelSchema.optional(),
        startDate: z.string().optional(), // ISO date
        endDate: z.string().optional(), // ISO date
        hasDonation: z.boolean().optional(),
        hasEvent: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const {
        personId,
        donationId,
        eventId,
        channel,
        startDate,
        endDate,
        hasDonation,
        hasEvent,
        limit,
        offset,
      } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          tyn.*,
          p.first_name || ' ' || p.last_name as person_name,
          p.email as person_email,
          d.amount as donation_amount,
          d.donation_date as donation_date,
          e.title as event_title,
          e.start_at as event_date,
          creator.first_name || ' ' || creator.last_name as created_by_name
        FROM thank_you_note tyn
        INNER JOIN person p ON tyn.person_id = p.id AND p.deleted_at IS NULL
        LEFT JOIN donation d ON tyn.donation_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN event e ON tyn.event_id = e.id AND e.deleted_at IS NULL
        LEFT JOIN person creator ON tyn.created_by = creator.id AND creator.deleted_at IS NULL
        WHERE tyn.deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (personId) {
        queryParams.push(personId);
        queryText += ` AND tyn.person_id = $${queryParams.length}`;
      }

      if (donationId) {
        queryParams.push(donationId);
        queryText += ` AND tyn.donation_id = $${queryParams.length}`;
      }

      if (eventId) {
        queryParams.push(eventId);
        queryText += ` AND tyn.event_id = $${queryParams.length}`;
      }

      if (channel) {
        queryParams.push(channel);
        queryText += ` AND tyn.channel = $${queryParams.length}`;
      }

      if (startDate) {
        queryParams.push(startDate);
        queryText += ` AND tyn.note_date >= $${queryParams.length}`;
      }

      if (endDate) {
        queryParams.push(endDate);
        queryText += ` AND tyn.note_date <= $${queryParams.length}`;
      }

      if (hasDonation !== undefined) {
        queryText += hasDonation
          ? ` AND tyn.donation_id IS NOT NULL`
          : ` AND tyn.donation_id IS NULL`;
      }

      if (hasEvent !== undefined) {
        queryText += hasEvent
          ? ` AND tyn.event_id IS NOT NULL`
          : ` AND tyn.event_id IS NULL`;
      }

      queryText += ` ORDER BY tyn.note_date DESC, tyn.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      // Build count query with same filters
      let countQuery = `
        SELECT COUNT(*) as total
        FROM thank_you_note tyn
        WHERE tyn.deleted_at IS NULL
      `;
      const countParams: QueryParam[] = [];

      if (personId) {
        countParams.push(personId);
        countQuery += ` AND tyn.person_id = $${countParams.length}`;
      }
      if (donationId) {
        countParams.push(donationId);
        countQuery += ` AND tyn.donation_id = $${countParams.length}`;
      }
      if (eventId) {
        countParams.push(eventId);
        countQuery += ` AND tyn.event_id = $${countParams.length}`;
      }
      if (channel) {
        countParams.push(channel);
        countQuery += ` AND tyn.channel = $${countParams.length}`;
      }
      if (startDate) {
        countParams.push(startDate);
        countQuery += ` AND tyn.note_date >= $${countParams.length}`;
      }
      if (endDate) {
        countParams.push(endDate);
        countQuery += ` AND tyn.note_date <= $${countParams.length}`;
      }
      if (hasDonation !== undefined) {
        countQuery += hasDonation
          ? ` AND tyn.donation_id IS NOT NULL`
          : ` AND tyn.donation_id IS NULL`;
      }
      if (hasEvent !== undefined) {
        countQuery += hasEvent
          ? ` AND tyn.event_id IS NOT NULL`
          : ` AND tyn.event_id IS NULL`;
      }

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant(tenantId, queryText, queryParams),
        queryWithTenant(tenantId, countQuery, countParams),
      ]);

      return {
        notes: dataResult.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<ThankYouNote>(
        tenantId,
        `SELECT
          tyn.*,
          p.first_name || ' ' || p.last_name as person_name,
          p.email as person_email,
          d.amount as donation_amount,
          d.donation_date as donation_date,
          e.title as event_title,
          e.start_at as event_date,
          creator.first_name || ' ' || creator.last_name as created_by_name
        FROM thank_you_note tyn
        INNER JOIN person p ON tyn.person_id = p.id AND p.deleted_at IS NULL
        LEFT JOIN donation d ON tyn.donation_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN event e ON tyn.event_id = e.id AND e.deleted_at IS NULL
        LEFT JOIN person creator ON tyn.created_by = creator.id AND creator.deleted_at IS NULL
        WHERE tyn.id = $1 AND tyn.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thank-you note not found' });
      }

      return result.rows[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string().uuid(),
        donationId: z.string().uuid().optional(),
        eventId: z.string().uuid().optional(),
        noteDate: z.string(), // ISO date, defaults to today in DB
        channel: ChannelSchema,
        subject: z.string().max(200).optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId!;

      // Verify person exists and belongs to tenant
      const personCheck = await queryWithTenant(
        tenantId,
        `SELECT id FROM person WHERE id = $1 AND deleted_at IS NULL`,
        [input.personId]
      );

      if (personCheck.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Person not found' });
      }

      // If donation_id provided, verify it exists and belongs to this person
      if (input.donationId) {
        const donationCheck = await queryWithTenant(
          tenantId,
          `SELECT id FROM donation WHERE id = $1 AND person_id = $2 AND deleted_at IS NULL`,
          [input.donationId, input.personId]
        );

        if (donationCheck.rows.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Donation not found or does not belong to this person',
          });
        }
      }

      // If event_id provided, verify it exists
      if (input.eventId) {
        const eventCheck = await queryWithTenant(
          tenantId,
          `SELECT id FROM event WHERE id = $1 AND deleted_at IS NULL`,
          [input.eventId]
        );

        if (eventCheck.rows.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Event not found' });
        }
      }

      const result = await queryWithTenant<ThankYouNote>(
        tenantId,
        `INSERT INTO thank_you_note (
          tenant_id, person_id, donation_id, event_id,
          note_date, channel, subject, body, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          tenantId,
          input.personId,
          input.donationId || null,
          input.eventId || null,
          input.noteDate,
          input.channel,
          input.subject || null,
          input.body || null,
          userId,
        ]
      );

      return result.rows[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        noteDate: z.string().optional(),
        channel: ChannelSchema.optional(),
        subject: z.string().max(200).nullable().optional(),
        body: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: QueryParam[] = [id];
      let paramIndex = 2;

      // Map camelCase to snake_case
      const fieldMap: Record<string, string> = {
        noteDate: 'note_date',
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = fieldMap[key] || key;
          setClauses.push(`${dbField} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant<ThankYouNote>(
        tenantId,
        `UPDATE thank_you_note
         SET ${setClauses.join(', ')}
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thank-you note not found' });
      }

      return result.rows[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE thank_you_note
         SET deleted_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thank-you note not found' });
      }

      return { success: true };
    }),

  // ============================================================================
  // STATS
  // ============================================================================

  stats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date
        endDate: z.string(), // ISO date
      })
    )
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          COUNT(*) as total_notes,
          COUNT(DISTINCT person_id) as unique_recipients,
          COUNT(DISTINCT donation_id) FILTER (WHERE donation_id IS NOT NULL) as donation_related,
          COUNT(DISTINCT event_id) FILTER (WHERE event_id IS NOT NULL) as event_related,
          COUNT(*) FILTER (WHERE channel = 'Card') as card_count,
          COUNT(*) FILTER (WHERE channel = 'Email') as email_count,
          COUNT(*) FILTER (WHERE channel = 'Text') as text_count,
          COUNT(*) FILTER (WHERE channel = 'Call') as call_count,
          COUNT(*) FILTER (WHERE channel = 'In-Person') as in_person_count
        FROM thank_you_note
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND note_date BETWEEN $2 AND $3`,
        [tenantId, startDate, endDate]
      );

      return result.rows[0];
    }),
});

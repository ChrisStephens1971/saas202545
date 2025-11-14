import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { TRPCError } from '@trpc/server';

interface Person {
  id: string;
  tenant_id: string;
  household_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  member_since: Date | null;
  membership_status: string;
  planning_center_id: string | null;
  external_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const peopleRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { search, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          id,
          tenant_id,
          household_id,
          first_name,
          last_name,
          email,
          phone,
          photo_url,
          date_of_birth,
          gender,
          member_since,
          membership_status,
          created_at,
          updated_at
        FROM person
        WHERE deleted_at IS NULL
      `;

      const queryParams: any[] = [];

      if (search && search.trim().length > 0) {
        queryParams.push(`%${search}%`);
        queryText += ` AND (
          first_name ILIKE $${queryParams.length}
          OR last_name ILIKE $${queryParams.length}
          OR email ILIKE $${queryParams.length}
        )`;
      }

      queryText += ` ORDER BY last_name, first_name LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM person
        WHERE deleted_at IS NULL
        ${search && search.trim().length > 0 ? `AND (
          first_name ILIKE $1
          OR last_name ILIKE $1
          OR email ILIKE $1
        )` : ''}
      `;

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant<Person>(tenantId, queryText, queryParams),
        queryWithTenant<{ total: string }>(
          tenantId,
          countQuery,
          search && search.trim().length > 0 ? [`%${search}%`] : []
        ),
      ]);

      return {
        people: dataResult.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          householdId: row.household_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          photoUrl: row.photo_url,
          dateOfBirth: row.date_of_birth,
          gender: row.gender,
          memberSince: row.member_since,
          membershipStatus: row.membership_status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        total: parseInt(countResult.rows[0].total, 10),
        limit,
        offset,
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
          household_id,
          first_name,
          last_name,
          email,
          phone,
          photo_url,
          date_of_birth,
          gender,
          member_since,
          membership_status,
          planning_center_id,
          external_id,
          created_at,
          updated_at
        FROM person
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await queryWithTenant<Person>(tenantId, queryText, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        });
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        householdId: row.household_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        photoUrl: row.photo_url,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        memberSince: row.member_since,
        membershipStatus: row.membership_status,
        planningCenterId: row.planning_center_id,
        externalId: row.external_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().date().optional(),
        gender: z.string().optional(),
        householdId: z.string().uuid().optional(),
        memberSince: z.string().date().optional(),
        membershipStatus: z.enum(['member', 'attendee', 'visitor']).default('member'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const insertQuery = `
        INSERT INTO person (
          tenant_id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          household_id,
          member_since,
          membership_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          tenant_id,
          household_id,
          first_name,
          last_name,
          email,
          phone,
          photo_url,
          date_of_birth,
          gender,
          member_since,
          membership_status,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<Person>(tenantId, insertQuery, [
        tenantId,
        input.firstName,
        input.lastName,
        input.email || null,
        input.phone || null,
        input.dateOfBirth || null,
        input.gender || null,
        input.householdId || null,
        input.memberSince || null,
        input.membershipStatus,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        householdId: row.household_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        photoUrl: row.photo_url,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        memberSince: row.member_since,
        membershipStatus: row.membership_status,
        planningCenterId: null,
        externalId: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: null,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().date().optional(),
        gender: z.string().optional(),
        householdId: z.string().uuid().optional(),
        memberSince: z.string().date().optional(),
        membershipStatus: z.enum(['member', 'attendee', 'visitor']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if person exists
      const existsQuery = `
        SELECT id FROM person
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const exists = await queryWithTenant(tenantId, existsQuery, [input.id]);

      if (exists.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        });
      }

      const updateQuery = `
        UPDATE person
        SET first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            phone = COALESCE($5, phone),
            date_of_birth = COALESCE($6, date_of_birth),
            gender = COALESCE($7, gender),
            household_id = COALESCE($8, household_id),
            member_since = COALESCE($9, member_since),
            membership_status = COALESCE($10, membership_status),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(tenantId, updateQuery, [
        input.id,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.dateOfBirth,
        input.gender,
        input.householdId,
        input.memberSince,
        input.membershipStatus,
      ]);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const deleteQuery = `
        UPDATE person
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, deleteQuery, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        });
      }

      return { success: true };
    }),
});

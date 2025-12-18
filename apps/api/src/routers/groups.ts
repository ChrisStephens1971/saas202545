import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';
import { pgCountToNumber } from '../lib/dbNumeric';

// Unused interfaces - can be added back when needed for type safety
// interface Group { ... }
// interface GroupMember { ... }

export const groupsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { category, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          g.id,
          g.name,
          g.description,
          g.category,
          g.leader_id,
          g.is_public,
          g.max_members,
          g.created_at,
          g.updated_at,
          p.first_name as leader_first_name,
          p.last_name as leader_last_name,
          COUNT(gm.id) as member_count
        FROM "group" g
        LEFT JOIN person p ON g.leader_id = p.id
        LEFT JOIN group_member gm ON g.id = gm.group_id AND gm.deleted_at IS NULL
        WHERE g.deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (category) {
        queryParams.push(category);
        queryText += ` AND g.category = $${queryParams.length}`;
      }

      queryText += ` GROUP BY g.id, p.first_name, p.last_name ORDER BY g.name LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM "group"
        WHERE deleted_at IS NULL
        ${category ? `AND category = $1` : ''}
      `;
      const countResult = await queryWithTenant(
        tenantId,
        countQuery,
        category ? [category] : []
      );

      return {
        groups: result.rows,
        total: pgCountToNumber(countResult.rows[0].total),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          g.*,
          p.first_name as leader_first_name,
          p.last_name as leader_last_name
        FROM "group" g
        LEFT JOIN person p ON g.leader_id = p.id
        WHERE g.id = $1 AND g.deleted_at IS NULL`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      return result.rows[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().max(100).optional(),
        leader_id: z.string().uuid().optional(),
        is_public: z.boolean().default(true),
        max_members: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO "group" (
          tenant_id, name, description, category, leader_id, is_public, max_members
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenantId,
          input.name,
          input.description || null,
          input.category || null,
          input.leader_id || null,
          input.is_public,
          input.max_members || null,
        ]
      );

      return result.rows[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.string().max(100).optional(),
        leader_id: z.string().uuid().optional(),
        is_public: z.boolean().optional(),
        max_members: z.number().positive().optional(),
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
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant(
        tenantId,
        `UPDATE "group"
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
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
        `UPDATE "group"
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      return { success: true };
    }),

  // Group members
  listMembers: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { groupId } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          gm.id,
          gm.group_id,
          gm.person_id,
          gm.role,
          gm.joined_at,
          p.first_name,
          p.last_name,
          p.email,
          p.photo_url,
          p.membership_status
        FROM group_member gm
        JOIN person p ON gm.person_id = p.id
        WHERE gm.group_id = $1 AND gm.deleted_at IS NULL
        ORDER BY gm.role DESC, p.last_name, p.first_name`,
        [groupId]
      );

      return result.rows;
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        personId: z.string().uuid(),
        role: z.enum(['leader', 'member']).default('member'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO group_member (tenant_id, group_id, person_id, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [tenantId, input.groupId, input.personId, input.role]
      );

      return result.rows[0];
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        personId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE group_member
        SET deleted_at = NOW()
        WHERE group_id = $1 AND person_id = $2 AND deleted_at IS NULL
        RETURNING id`,
        [input.groupId, input.personId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }

      return { success: true };
    }),
});

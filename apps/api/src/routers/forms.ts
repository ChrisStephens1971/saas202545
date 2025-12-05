import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';

/** Database row type for form */
export interface FormRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'closed' | 'archived';
  allow_multiple_submissions: boolean;
  require_login: boolean;
  notification_email: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  submission_count?: string;
}

/** Database row type for form field */
export interface FormFieldRow {
  id: string;
  form_id: string;
  tenant_id: string;
  label: string;
  field_type: string;
  is_required: boolean;
  placeholder: string | null;
  help_text: string | null;
  options: string[] | null;
  sequence: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const formFieldSchema = z.object({
  label: z.string().min(1).max(255),
  field_type: z.enum(['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'multiselect', 'checkbox', 'radio']),
  is_required: z.boolean().default(false),
  placeholder: z.string().max(255).optional(),
  help_text: z.string().optional(),
  options: z.array(z.string()).optional(),
  sequence: z.number().int().min(0),
});

export const formsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'active', 'closed', 'archived']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { status, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          f.*,
          COUNT(fs.id) as submission_count
        FROM form f
        LEFT JOIN form_submission fs ON f.id = fs.form_id
        WHERE f.deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (status) {
        queryParams.push(status);
        queryText += ` AND f.status = $${queryParams.length}`;
      }

      queryText += ` GROUP BY f.id ORDER BY f.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const result = await queryWithTenant<FormRow>(tenantId, queryText, queryParams);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM form
        WHERE deleted_at IS NULL
        ${status ? `AND status = $1` : ''}
      `;
      const countResult = await queryWithTenant<{ total: string }>(
        tenantId,
        countQuery,
        status ? [status] : []
      );

      return {
        forms: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const formResult = await queryWithTenant<FormRow>(
        tenantId,
        `SELECT * FROM form WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (formResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Form not found' });
      }

      const fieldsResult = await queryWithTenant<FormFieldRow>(
        tenantId,
        `SELECT * FROM form_field WHERE form_id = $1 AND deleted_at IS NULL ORDER BY sequence`,
        [id]
      );

      return {
        ...formResult.rows[0],
        fields: fieldsResult.rows,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        allow_multiple_submissions: z.boolean().default(false),
        require_login: z.boolean().default(false),
        notification_email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO form (
          tenant_id, title, description, allow_multiple_submissions,
          require_login, notification_email, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenantId,
          input.title,
          input.description || null,
          input.allow_multiple_submissions,
          input.require_login,
          input.notification_email || null,
          ctx.userId || null,
        ]
      );

      return result.rows[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['draft', 'active', 'closed', 'archived']).optional(),
        allow_multiple_submissions: z.boolean().optional(),
        require_login: z.boolean().optional(),
        notification_email: z.string().email().optional(),
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
        `UPDATE form
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Form not found' });
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
        `UPDATE form
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Form not found' });
      }

      return { success: true };
    }),

  // Form fields
  addField: protectedProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        field: formFieldSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO form_field (
          tenant_id, form_id, label, field_type, is_required,
          placeholder, help_text, options, sequence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          tenantId,
          input.formId,
          input.field.label,
          input.field.field_type,
          input.field.is_required,
          input.field.placeholder || null,
          input.field.help_text || null,
          input.field.options ? JSON.stringify(input.field.options) : null,
          input.field.sequence,
        ]
      );

      return result.rows[0];
    }),

  updateField: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        field: formFieldSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, field } = input;
      const tenantId = ctx.tenantId!;

      const setClauses: string[] = [];
      const values: QueryParam[] = [id];
      let paramIndex = 2;

      Object.entries(field).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(key === 'options' && Array.isArray(value) ? JSON.stringify(value) : value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const result = await queryWithTenant(
        tenantId,
        `UPDATE form_field
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Field not found' });
      }

      return result.rows[0];
    }),

  deleteField: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE form_field
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Field not found' });
      }

      return { success: true };
    }),

  // Submissions
  listSubmissions: protectedProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { formId, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `SELECT
          fs.*,
          p.first_name,
          p.last_name,
          p.email
        FROM form_submission fs
        LEFT JOIN person p ON fs.person_id = p.id
        WHERE fs.form_id = $1
        ORDER BY fs.created_at DESC
        LIMIT $2 OFFSET $3`,
        [formId, limit, offset]
      );

      const countResult = await queryWithTenant(
        tenantId,
        `SELECT COUNT(*) as total FROM form_submission WHERE form_id = $1`,
        [formId]
      );

      return {
        submissions: result.rows,
        total: parseInt(countResult.rows[0].total, 10),
      };
    }),

  submitForm: protectedProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        responses: z.record(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `INSERT INTO form_submission (tenant_id, form_id, person_id, responses)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          tenantId,
          input.formId,
          ctx.userId || null,
          JSON.stringify(input.responses),
        ]
      );

      return result.rows[0];
    }),
});

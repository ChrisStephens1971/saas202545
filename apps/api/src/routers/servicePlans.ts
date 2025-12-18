/**
 * Service Plans Router
 *
 * tRPC router for Sunday Service Plan operations.
 * Provides load/save endpoints for the Sunday Planner UI.
 *
 * Data model:
 * - Service plans are tied to bulletin_issue (by id/date)
 * - Items are stored in service_item table with section grouping
 * - Templates are stored in service_plan_template + service_plan_template_item
 * - Times are computed client-side, not stored
 *
 * Phase 8: Added template support (save as template, create from template)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant, db } from '../db';
import { TRPCError } from '@trpc/server';
import {
  buildServicePlanDTO,
  flattenSectionsToItems,
  serviceItemToDbInput,
  type ServiceItemRow,
  type BulletinIssueRow,
  type ServicePlanDTO,
  groupItemsIntoSections,
} from '../lib/servicePlanMappers';

// ============================================================================
// Zod Schemas
// ============================================================================

const ServiceItemTypeSchema = z.enum([
  'song',
  'scripture',
  'prayer',
  'communion',
  'announcement',
  'offering',
  'sermon',
  'transition',
  'note',
]);

const ServiceItemSchema = z.object({
  id: z.string(),
  type: ServiceItemTypeSchema,
  title: z.string().min(1),
  subtitle: z.string().optional(),
  duration: z.number().int().min(0).max(120),
  notes: z.string().optional(),
  ccliNumber: z.string().optional(),
  scriptureRef: z.string().optional(),
});

const ServiceSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  items: z.array(ServiceItemSchema),
});

const ServicePlanSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(),
  status: z.enum(['draft', 'published']),
  sections: z.array(ServiceSectionSchema),
});

// ============================================================================
// Router
// ============================================================================

export const servicePlansRouter = router({
  /**
   * Get a service plan by bulletin ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }): Promise<ServicePlanDTO> => {
      const tenantId = ctx.tenantId!;

      // Get bulletin info
      const bulletinQuery = `
        SELECT id, tenant_id, issue_date, status, start_time
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<BulletinIssueRow>(
        tenantId,
        bulletinQuery,
        [input.id]
      );

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service plan not found',
        });
      }

      const bulletinRow = bulletinResult.rows[0];

      // Get service items for this date
      const itemsQuery = `
        SELECT
          id, tenant_id, service_date, type, sequence,
          title, content, ccli_number, artist, scripture_ref,
          speaker, duration_minutes, section, notes,
          created_at, updated_at, deleted_at
        FROM service_item
        WHERE service_date = $1 AND deleted_at IS NULL
        ORDER BY sequence ASC
      `;

      const itemsResult = await queryWithTenant<ServiceItemRow>(
        tenantId,
        itemsQuery,
        [bulletinRow.issue_date]
      );

      return buildServicePlanDTO(bulletinRow, itemsResult.rows);
    }),

  /**
   * Get the current (next upcoming) service plan
   * Finds the bulletin for the next Sunday or creates one if needed
   */
  getCurrent: protectedProcedure.query(async ({ ctx }): Promise<ServicePlanDTO | null> => {
    const tenantId = ctx.tenantId!;

    // Find the next Sunday (or today if it's Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    const sundayStr = nextSunday.toISOString().split('T')[0];

    // Look for bulletin on or after today
    const bulletinQuery = `
      SELECT id, tenant_id, issue_date, status, start_time
      FROM bulletin_issue
      WHERE issue_date >= $1 AND deleted_at IS NULL
      ORDER BY issue_date ASC
      LIMIT 1
    `;

    const bulletinResult = await queryWithTenant<BulletinIssueRow>(
      tenantId,
      bulletinQuery,
      [sundayStr]
    );

    if (bulletinResult.rows.length === 0) {
      return null;
    }

    const bulletinRow = bulletinResult.rows[0];

    // Get service items
    const itemsQuery = `
      SELECT
        id, tenant_id, service_date, type, sequence,
        title, content, ccli_number, artist, scripture_ref,
        speaker, duration_minutes, section, notes,
        created_at, updated_at, deleted_at
      FROM service_item
      WHERE service_date = $1 AND deleted_at IS NULL
      ORDER BY sequence ASC
    `;

    const itemsResult = await queryWithTenant<ServiceItemRow>(
      tenantId,
      itemsQuery,
      [bulletinRow.issue_date]
    );

    return buildServicePlanDTO(bulletinRow, itemsResult.rows);
  }),

  /**
   * Save/update a service plan
   * Atomically updates all service items for the plan
   */
  save: protectedProcedure
    .input(ServicePlanSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify bulletin exists and is not locked
      const bulletinQuery = `
        SELECT id, issue_date, status
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<{
        id: string;
        issue_date: Date;
        status: string;
      }>(tenantId, bulletinQuery, [input.id]);

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service plan not found',
        });
      }

      const bulletin = bulletinResult.rows[0];

      if (bulletin.status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify a locked service plan',
        });
      }

      // Flatten sections to items
      const itemsToSave = flattenSectionsToItems(input.sections);

      // Get existing item IDs for this date
      const existingQuery = `
        SELECT id FROM service_item
        WHERE service_date = $1 AND deleted_at IS NULL
      `;

      const existingResult = await queryWithTenant<{ id: string }>(
        tenantId,
        existingQuery,
        [bulletin.issue_date]
      );

      const existingIds = new Set(existingResult.rows.map((r) => r.id));
      const newIds = new Set(itemsToSave.filter((i) => i.id).map((i) => i.id));

      // Items to delete: exist in DB but not in new list
      const idsToDelete = [...existingIds].filter((id) => !newIds.has(id));

      // Use transaction for atomic updates
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);

        // Delete removed items (soft delete)
        if (idsToDelete.length > 0) {
          await client.query(
            `UPDATE service_item SET deleted_at = NOW() WHERE id = ANY($1)`,
            [idsToDelete]
          );
        }

        // Upsert items
        for (const item of itemsToSave) {
          const dbItem = serviceItemToDbInput(
            item,
            bulletin.issue_date,
            tenantId
          );

          if (item.id && existingIds.has(item.id)) {
            // Update existing
            await client.query(
              `UPDATE service_item SET
                type = $2, sequence = $3, title = $4, content = $5,
                ccli_number = $6, scripture_ref = $7, duration_minutes = $8,
                section = $9, notes = $10, updated_at = NOW()
              WHERE id = $1 AND deleted_at IS NULL`,
              [
                item.id,
                dbItem.type,
                dbItem.sequence,
                dbItem.title,
                dbItem.content,
                dbItem.ccli_number,
                dbItem.scripture_ref,
                dbItem.duration_minutes,
                dbItem.section,
                dbItem.notes,
              ]
            );
          } else {
            // Insert new (generate ID if not provided)
            const insertId = item.id || undefined;
            const insertQuery = insertId
              ? `INSERT INTO service_item (
                  id, tenant_id, service_date, type, sequence, title, content,
                  ccli_number, scripture_ref, duration_minutes, section, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
              : `INSERT INTO service_item (
                  tenant_id, service_date, type, sequence, title, content,
                  ccli_number, scripture_ref, duration_minutes, section, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

            const params = insertId
              ? [
                  insertId,
                  tenantId,
                  bulletin.issue_date,
                  dbItem.type,
                  dbItem.sequence,
                  dbItem.title,
                  dbItem.content,
                  dbItem.ccli_number,
                  dbItem.scripture_ref,
                  dbItem.duration_minutes,
                  dbItem.section,
                  dbItem.notes,
                ]
              : [
                  tenantId,
                  bulletin.issue_date,
                  dbItem.type,
                  dbItem.sequence,
                  dbItem.title,
                  dbItem.content,
                  dbItem.ccli_number,
                  dbItem.scripture_ref,
                  dbItem.duration_minutes,
                  dbItem.section,
                  dbItem.notes,
                ];

            await client.query(insertQuery, params);
          }
        }

        // Update bulletin start_time if changed
        await client.query(
          `UPDATE bulletin_issue SET start_time = $2, updated_at = NOW() WHERE id = $1`,
          [input.id, input.startTime]
        );

        await client.query('COMMIT');

        return { success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }),

  /**
   * List available service plans (bulletins)
   * Returns summaries for plan selection UI
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        includeStatus: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      let query = `
        SELECT
          bi.id,
          bi.issue_date,
          bi.status,
          bi.start_time,
          (
            SELECT COUNT(*)
            FROM service_item si
            WHERE si.service_date = bi.issue_date
              AND si.deleted_at IS NULL
          ) as item_count
        FROM bulletin_issue bi
        WHERE bi.deleted_at IS NULL
      `;

      const params: (string | number)[] = [];

      if (input.includeStatus && input.includeStatus.length > 0) {
        params.push(...input.includeStatus);
        const placeholders = input.includeStatus.map((_, i) => `$${i + 1}`).join(', ');
        query += ` AND bi.status IN (${placeholders})`;
      }

      params.push(input.limit);
      query += ` ORDER BY bi.issue_date DESC LIMIT $${params.length}`;

      const result = await queryWithTenant<{
        id: string;
        issue_date: Date;
        status: string;
        start_time: string | null;
        item_count: string;
      }>(tenantId, query, params);

      return result.rows.map((row) => ({
        id: row.id,
        date: row.issue_date.toISOString().split('T')[0],
        status: row.status,
        startTime: row.start_time || '10:00 AM',
        itemCount: parseInt(row.item_count, 10),
      }));
    }),

  // ============================================================================
  // Template Operations (Phase 8)
  // ============================================================================

  /**
   * List all templates
   */
  listTemplates: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const query = `
        SELECT
          t.id,
          t.name,
          t.description,
          t.start_time,
          t.created_at,
          (
            SELECT COUNT(*)
            FROM service_plan_template_item ti
            WHERE ti.template_id = t.id
              AND ti.deleted_at IS NULL
          ) as item_count
        FROM service_plan_template t
        WHERE t.deleted_at IS NULL
        ORDER BY t.created_at DESC
        LIMIT $1
      `;

      const result = await queryWithTenant<{
        id: string;
        name: string;
        description: string | null;
        start_time: string | null;
        created_at: Date;
        item_count: string;
      }>(tenantId, query, [input.limit]);

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        startTime: row.start_time || '10:00 AM',
        createdAt: row.created_at.toISOString(),
        itemCount: parseInt(row.item_count, 10),
        isTemplate: true as const,
      }));
    }),

  /**
   * Get a template by ID
   */
  getTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get template info
      const templateQuery = `
        SELECT id, name, description, start_time, created_at
        FROM service_plan_template
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const templateResult = await queryWithTenant<{
        id: string;
        name: string;
        description: string | null;
        start_time: string | null;
        created_at: Date;
      }>(tenantId, templateQuery, [input.id]);

      if (templateResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      const template = templateResult.rows[0];

      // Get template items
      const itemsQuery = `
        SELECT
          id, tenant_id, template_id, type, sequence,
          title, content, ccli_number, scripture_ref,
          duration_minutes, section, notes,
          created_at, updated_at, deleted_at
        FROM service_plan_template_item
        WHERE template_id = $1 AND deleted_at IS NULL
        ORDER BY sequence ASC
      `;

      const itemsResult = await queryWithTenant<{
        id: string;
        tenant_id: string;
        template_id: string;
        type: string;
        sequence: number;
        title: string | null;
        content: string | null;
        ccli_number: string | null;
        scripture_ref: string | null;
        duration_minutes: number | null;
        section: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      }>(tenantId, itemsQuery, [input.id]);

      // Convert to ServiceItemRow format for reuse of existing mapping
      const itemRows: ServiceItemRow[] = itemsResult.rows.map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        service_date: new Date(), // Placeholder, not used for templates
        type: row.type,
        sequence: row.sequence,
        title: row.title,
        content: row.content,
        ccli_number: row.ccli_number,
        artist: null,
        scripture_ref: row.scripture_ref,
        speaker: null,
        duration_minutes: row.duration_minutes,
        section: row.section,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      }));

      return {
        id: template.id,
        name: template.name,
        description: template.description || undefined,
        startTime: template.start_time || '10:00 AM',
        createdAt: template.created_at.toISOString(),
        sections: groupItemsIntoSections(itemRows),
        isTemplate: true as const,
      };
    }),

  /**
   * Save a plan as a template
   * Creates a new template with sections/items copied from the current plan state
   */
  saveAsTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        startTime: z.string().default('10:00 AM'),
        sections: z.array(ServiceSectionSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);

        // Create template
        const templateResult = await client.query<{ id: string }>(
          `INSERT INTO service_plan_template (tenant_id, name, description, start_time)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [tenantId, input.name, input.description || null, input.startTime]
        );

        const templateId = templateResult.rows[0].id;

        // Flatten and insert items
        const items = flattenSectionsToItems(input.sections);

        for (const item of items) {
          await client.query(
            `INSERT INTO service_plan_template_item (
              tenant_id, template_id, type, sequence, title, content,
              ccli_number, scripture_ref, duration_minutes, section, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              tenantId,
              templateId,
              item.type.charAt(0).toUpperCase() + item.type.slice(1), // Convert to PascalCase
              item.sequence,
              item.title,
              item.subtitle || null,
              item.ccliNumber || null,
              item.scriptureRef || null,
              item.duration,
              item.sectionId,
              item.notes || null,
            ]
          );
        }

        await client.query('COMMIT');

        return { id: templateId, success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }),

  /**
   * Create a new service plan from a template
   * Copies template structure into a new bulletin + service_item records
   */
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get template
      const templateQuery = `
        SELECT id, name, start_time
        FROM service_plan_template
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const templateResult = await queryWithTenant<{
        id: string;
        name: string;
        start_time: string | null;
      }>(tenantId, templateQuery, [input.templateId]);

      if (templateResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      const template = templateResult.rows[0];

      // Get template items
      const itemsQuery = `
        SELECT type, sequence, title, content, ccli_number, scripture_ref,
               duration_minutes, section, notes
        FROM service_plan_template_item
        WHERE template_id = $1 AND deleted_at IS NULL
        ORDER BY sequence ASC
      `;

      const itemsResult = await queryWithTenant<{
        type: string;
        sequence: number;
        title: string | null;
        content: string | null;
        ccli_number: string | null;
        scripture_ref: string | null;
        duration_minutes: number | null;
        section: string | null;
        notes: string | null;
      }>(tenantId, itemsQuery, [input.templateId]);

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);

        // Check if bulletin for this date already exists
        const existingCheck = await client.query(
          `SELECT id FROM bulletin_issue
           WHERE tenant_id = $1 AND issue_date = $2 AND deleted_at IS NULL`,
          [tenantId, input.date]
        );

        let bulletinId: string;

        if (existingCheck.rows.length > 0) {
          // Use existing bulletin
          bulletinId = existingCheck.rows[0].id;

          // Delete existing service items for this date
          await client.query(
            `UPDATE service_item SET deleted_at = NOW()
             WHERE tenant_id = $1 AND service_date = $2 AND deleted_at IS NULL`,
            [tenantId, input.date]
          );

          // Update start time
          await client.query(
            `UPDATE bulletin_issue SET start_time = $2, updated_at = NOW() WHERE id = $1`,
            [bulletinId, template.start_time || '10:00 AM']
          );
        } else {
          // Create new bulletin
          const bulletinResult = await client.query<{ id: string }>(
            `INSERT INTO bulletin_issue (tenant_id, issue_date, status, start_time)
             VALUES ($1, $2, 'draft', $3)
             RETURNING id`,
            [tenantId, input.date, template.start_time || '10:00 AM']
          );
          bulletinId = bulletinResult.rows[0].id;
        }

        // Insert service items from template
        for (const item of itemsResult.rows) {
          await client.query(
            `INSERT INTO service_item (
              tenant_id, service_date, type, sequence, title, content,
              ccli_number, scripture_ref, duration_minutes, section, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              tenantId,
              input.date,
              item.type,
              item.sequence,
              item.title,
              item.content,
              item.ccli_number,
              item.scripture_ref,
              item.duration_minutes,
              item.section,
              item.notes,
            ]
          );
        }

        await client.query('COMMIT');

        return { id: bulletinId, success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }),

  /**
   * Delete a template
   */
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant(
        tenantId,
        `UPDATE service_plan_template SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [input.id]
      );

      if (result.rowCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return { success: true };
    }),
});

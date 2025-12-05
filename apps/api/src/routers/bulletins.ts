import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db, queryWithTenant, QueryParam } from '../db';
import { TRPCError } from '@trpc/server';

// Bulletin status enum
const BulletinStatusSchema = z.enum(['draft', 'approved', 'built', 'locked']);

interface BulletinIssue {
  id: string;
  tenant_id: string;
  issue_date: Date;
  status: 'draft' | 'approved' | 'built' | 'locked';
  brand_pack_id: string | null;
  pdf_url: string | null;
  pdf_large_print_url: string | null;
  slides_json: unknown | null;
  loop_mp4_url: string | null;
  email_html: string | null;
  propresenter_bundle_url: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  reopened_at: Date | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  content_hash: string | null;
  template_key: string | null;
  design_options: Record<string, unknown> | null;
  canvas_layout_json: Record<string, unknown> | null;
  use_canvas_layout: boolean;
  is_published: boolean;
  is_public: boolean;
  public_token: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// Generator payload schema for storing/retrieving bulletin generator data
const GeneratorPayloadSchema = z.object({
  viewModel: z.record(z.unknown()).optional(),
  markerLegend: z.array(z.object({
    marker: z.string(),
    meaning: z.string(),
    description: z.string().optional(),
  })).optional(),
  designOptions: z.record(z.unknown()).optional(),
});


export const bulletinsRouter = router({
  // List all bulletins for tenant
  list: protectedProcedure
    .input(
      z.object({
        status: BulletinStatusSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { status, limit, offset } = input;
      const tenantId = ctx.tenantId!;

      let queryText = `
        SELECT
          id,
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          pdf_url,
          locked_at,
          locked_by,
          created_at,
          updated_at
        FROM bulletin_issue
        WHERE deleted_at IS NULL
      `;

      const queryParams: QueryParam[] = [];

      if (status) {
        queryParams.push(status);
        queryText += ` AND status = $${queryParams.length}`;
      }

      queryText += ` ORDER BY issue_date DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM bulletin_issue
        WHERE deleted_at IS NULL
        ${status ? `AND status = $1` : ''}
      `;

      const [dataResult, countResult] = await Promise.all([
        queryWithTenant<BulletinIssue>(tenantId, queryText, queryParams),
        queryWithTenant<{ total: string }>(tenantId, countQuery, status ? [status] : []),
      ]);

      return {
        bulletins: dataResult.rows.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          serviceDate: row.issue_date,
          status: row.status,
          brandPackId: row.brand_pack_id,
          pdfUrl: row.pdf_url,
          lockedAt: row.locked_at,
          lockedBy: row.locked_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        total: parseInt(countResult.rows[0].total, 10),
        limit,
        offset,
      };
    }),

  // Get single bulletin by ID
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const queryText = `
        SELECT
          id,
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          pdf_url,
          pdf_large_print_url,
          slides_json,
          locked_at,
          locked_by,
          content_hash,
          template_key,
          design_options,
          canvas_layout_json,
          use_canvas_layout,
          created_at,
          updated_at
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await queryWithTenant<BulletinIssue>(tenantId, queryText, [input.id]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        serviceDate: row.issue_date,
        status: row.status,
        brandPackId: row.brand_pack_id,
        pdfUrl: row.pdf_url,
        pdfLargePrintUrl: row.pdf_large_print_url,
        slidesJson: row.slides_json,
        lockedAt: row.locked_at,
        lockedBy: row.locked_by,
        contentHash: row.content_hash,
        templateKey: row.template_key,
        designOptions: row.design_options,
        canvasLayoutJson: row.canvas_layout_json,
        useCanvasLayout: row.use_canvas_layout,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  // Create new bulletin issue
  create: protectedProcedure
    .input(
      z.object({
        serviceDate: z.string().datetime(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const serviceDate = new Date(input.serviceDate);

      // Check if bulletin already exists for this date
      const existingQuery = `
        SELECT id FROM bulletin_issue
        WHERE issue_date = $1 AND deleted_at IS NULL
      `;

      const existing = await queryWithTenant(tenantId, existingQuery, [serviceDate]);

      if (existing.rows.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bulletin already exists for this service date',
        });
      }

      const insertQuery = `
        INSERT INTO bulletin_issue (
          tenant_id,
          issue_date,
          status
        ) VALUES ($1, $2, $3)
        RETURNING
          id,
          tenant_id,
          issue_date,
          status,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<BulletinIssue>(
        tenantId,
        insertQuery,
        [tenantId, serviceDate, 'draft']
      );

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        serviceDate: row.issue_date,
        status: row.status,
        lockedAt: null,
        lockedBy: null,
        pdfUrl: null,
        slidesUrl: null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  // Update bulletin issue
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        serviceDate: z.string().datetime().optional(),
        status: BulletinStatusSchema.optional(),
        canvasLayoutJson: z.record(z.unknown()).optional(),
        useCanvasLayout: z.boolean().optional(),
        templateKey: z.string().optional(),
        designOptions: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.id]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked bulletin',
        });
      }

      const updateQuery = `
        UPDATE bulletin_issue
        SET status = COALESCE($2, status),
            issue_date = COALESCE($3, issue_date),
            canvas_layout_json = COALESCE($4, canvas_layout_json),
            use_canvas_layout = COALESCE($5, use_canvas_layout),
            template_key = COALESCE($6, template_key),
            design_options = COALESCE($7, design_options),
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(
        tenantId,
        updateQuery,
        [
          input.id,
          input.status,
          input.serviceDate ? new Date(input.serviceDate) : null,
          input.canvasLayoutJson || null,
          input.useCanvasLayout ?? null,
          input.templateKey || null,
          input.designOptions || null,
        ]
      );

      return { success: true };
    }),

  // Delete bulletin (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.id]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete locked bulletin',
        });
      }

      const deleteQuery = `
        UPDATE bulletin_issue
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `;

      await queryWithTenant(tenantId, deleteQuery, [input.id]);

      return { success: true };
    }),

  // Lock bulletin (Admin only - requires re-auth in production)
  lock: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const userId = ctx.userId; // Assumes userId is in context

      // Validate CCLI numbers using database function
      const validationQuery = `SELECT validate_ccli_for_lock($1) as valid`;
      const validationResult = await queryWithTenant<{ valid: boolean }>(
        tenantId,
        validationQuery,
        [input.id]
      );

      if (!validationResult.rows[0].valid) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'All songs must have CCLI numbers before locking',
        });
      }

      // Lock the bulletin
      const lockQuery = `
        UPDATE bulletin_issue
        SET status = 'locked',
            locked_at = NOW(),
            locked_by = $2,
            updated_at = NOW()
        WHERE id = $1 AND status != 'locked' AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await queryWithTenant(tenantId, lockQuery, [input.id, userId]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bulletin is already locked or not found',
        });
      }

      return { success: true };
    }),

  // Get bulletin by public share token (no auth required)
  getByPublicToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      // Get bulletin
      const bulletinQuery = `
        SELECT
          id,
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          pdf_url,
          pdf_large_print_url,
          slides_json,
          template_key,
          design_options,
          canvas_layout_json,
          use_canvas_layout,
          is_published,
          is_public,
          published_at,
          created_at,
          updated_at
        FROM bulletin_issue
        WHERE public_token = $1
          AND is_public = true
          AND is_published = true
          AND deleted_at IS NULL
      `;

      const bulletinResult = await db.query<BulletinIssue>(bulletinQuery, [input.token]);

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found or not publicly accessible',
        });
      }

      const row = bulletinResult.rows[0];
      const tenantId = row.tenant_id;

      // Get service items for this bulletin
      const itemsQuery = `
        SELECT
          id,
          item_type,
          title,
          description,
          order_index,
          duration_minutes,
          leader_name,
          song_id,
          ccli_number,
          scripture_reference,
          notes
        FROM service_item
        WHERE bulletin_issue_id = $1
          AND deleted_at IS NULL
        ORDER BY order_index
      `;

      const itemsResult = await db.query<{
        id: string;
        item_type: string;
        title: string;
        description: string | null;
        order_index: number;
        duration_minutes: number | null;
        leader_name: string | null;
        song_id: string | null;
        ccli_number: string | null;
        scripture_reference: string | null;
        notes: string | null;
      }>(itemsQuery, [row.id]);

      // Get org branding from brand_pack
      let orgBranding: {
        churchName: string | null;
        legalName: string | null;
        website: string | null;
        logoUrl: string | null;
      } | null = null;

      if (row.brand_pack_id) {
        const brandQuery = `
          SELECT
            name,
            logo_url
          FROM brand_pack
          WHERE id = $1
            AND tenant_id = $2
            AND deleted_at IS NULL
        `;

        const brandResult = await db.query<{
          name: string;
          logo_url: string | null;
        }>(brandQuery, [row.brand_pack_id, tenantId]);

        if (brandResult.rows.length > 0) {
          const brand = brandResult.rows[0];
          orgBranding = {
            churchName: brand.name,
            legalName: brand.name,
            website: null,
            logoUrl: brand.logo_url,
          };
        }
      }

      // Try to get tenant info for org branding if no brand pack
      if (!orgBranding) {
        const tenantQuery = `
          SELECT name
          FROM tenant
          WHERE id = $1
            AND deleted_at IS NULL
        `;

        const tenantResult = await db.query<{ name: string }>(tenantQuery, [tenantId]);

        if (tenantResult.rows.length > 0) {
          orgBranding = {
            churchName: tenantResult.rows[0].name,
            legalName: tenantResult.rows[0].name,
            website: null,
            logoUrl: null,
          };
        }
      }

      return {
        bulletin: {
          id: row.id,
          tenantId: row.tenant_id,
          serviceDate: row.issue_date,
          status: row.status,
          brandPackId: row.brand_pack_id,
          pdfUrl: row.pdf_url,
          pdfLargePrintUrl: row.pdf_large_print_url,
          slidesJson: row.slides_json,
          templateKey: row.template_key,
          designOptions: row.design_options,
          canvasLayoutJson: row.canvas_layout_json,
          useCanvasLayout: row.use_canvas_layout,
          isPublished: row.is_published,
          isPublic: row.is_public,
          publishedAt: row.published_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        serviceItems: itemsResult.rows.map((item) => ({
          id: item.id,
          itemType: item.item_type,
          title: item.title,
          description: item.description,
          orderIndex: item.order_index,
          durationMinutes: item.duration_minutes,
          speaker: item.leader_name,
          songId: item.song_id,
          ccliNumber: item.ccli_number,
          scriptureText: item.scripture_reference,
          notes: item.notes,
        })),
        orgBranding,
      };
    }),

  // Get generator payload for a bulletin
  getGeneratorPayload: protectedProcedure
    .input(z.object({ bulletinId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const queryText = `
        SELECT
          design_options,
          canvas_layout_json
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await queryWithTenant<BulletinIssue>(tenantId, queryText, [input.bulletinId]);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      const row = result.rows[0];
      // Return the generator payload structure
      return {
        viewModel: row.canvas_layout_json || {},
        markerLegend: [] as { marker: string; meaning: string; description?: string }[],
        designOptions: row.design_options || {},
      };
    }),

  // Save generator payload for a bulletin
  saveGeneratorPayload: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        payload: GeneratorPayloadSchema,
        viewModel: z.record(z.unknown()).optional(), // Accept viewModel directly too
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.bulletinId]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked bulletin',
        });
      }

      // Use viewModel from input or from payload
      const viewModelToSave = input.viewModel || input.payload.viewModel || null;

      const updateQuery = `
        UPDATE bulletin_issue
        SET design_options = $2,
            canvas_layout_json = $3,
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(
        tenantId,
        updateQuery,
        [
          input.bulletinId,
          input.payload.designOptions || null,
          viewModelToSave,
        ]
      );

      // Run preflight validation
      const ccliQuery = `
        SELECT COUNT(*) as missing_ccli
        FROM service_item
        WHERE bulletin_issue_id = $1
          AND item_type = 'song'
          AND (ccli_number IS NULL OR ccli_number = '')
          AND deleted_at IS NULL
      `;

      const ccliResult = await queryWithTenant<{ missing_ccli: string }>(
        tenantId,
        ccliQuery,
        [input.bulletinId]
      );

      const itemsQuery = `
        SELECT COUNT(*) as item_count
        FROM service_item
        WHERE bulletin_issue_id = $1 AND deleted_at IS NULL
      `;

      const itemsResult = await queryWithTenant<{ item_count: string }>(
        tenantId,
        itemsQuery,
        [input.bulletinId]
      );

      const missingCcli = parseInt(ccliResult.rows[0]?.missing_ccli || '0', 10);
      const itemCount = parseInt(itemsResult.rows[0]?.item_count || '0', 10);

      const preflight = {
        isValid: missingCcli === 0 && itemCount > 0,
        errors: missingCcli > 0 ? [`${missingCcli} song(s) are missing CCLI numbers`] : [],
        warnings: itemCount === 0 ? ['No service items added to this bulletin'] : [],
      };

      return { success: true, preflight };
    }),

  // Generate bulletin from service items
  generateFromService: protectedProcedure
    .input(z.object({ bulletinId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify bulletin exists and get current data
      const checkQuery = `
        SELECT id, status, issue_date, brand_pack_id, design_options, canvas_layout_json
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const check = await queryWithTenant<{
        id: string;
        status: string;
        issue_date: Date;
        brand_pack_id: string | null;
        design_options: Record<string, unknown> | null;
        canvas_layout_json: Record<string, unknown> | null;
      }>(
        tenantId,
        checkQuery,
        [input.bulletinId]
      );

      if (check.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (check.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot generate for locked bulletin',
        });
      }

      const bulletin = check.rows[0];

      // Get service items for this bulletin
      const itemsQuery = `
        SELECT id, item_type, title, description, leader_name, scripture_reference, ccli_number
        FROM service_item
        WHERE bulletin_issue_id = $1 AND deleted_at IS NULL
        ORDER BY order_index
      `;

      const itemsResult = await queryWithTenant<{
        id: string;
        item_type: string;
        title: string;
        description: string | null;
        leader_name: string | null;
        scripture_reference: string | null;
        ccli_number: string | null;
      }>(tenantId, itemsQuery, [input.bulletinId]);

      // Check preflight validation
      const missingCcli = itemsResult.rows.filter(
        item => item.item_type === 'song' && !item.ccli_number
      );

      const preflight = {
        isValid: missingCcli.length === 0 && itemsResult.rows.length > 0,
        errors: missingCcli.map(item => `Song "${item.title}" is missing CCLI number`),
        warnings: itemsResult.rows.length === 0 ? ['No service items added'] : [],
      };

      // Build view model from service items
      const viewModel = bulletin.canvas_layout_json || {
        id: bulletin.id,
        tenantId: tenantId,
        serviceDate: bulletin.issue_date,
        status: bulletin.status,
        serviceItems: itemsResult.rows.map(item => ({
          id: item.id,
          itemType: item.item_type,
          title: item.title,
          description: item.description,
          leader: item.leader_name,
          scriptureText: item.scripture_reference,
          ccliNumber: item.ccli_number,
        })),
        announcements: [],
        upcomingEvents: [],
        designOptions: bulletin.design_options || {},
      };

      return {
        success: true,
        bulletinId: input.bulletinId,
        generatedAt: new Date().toISOString(),
        viewModel,
        preflight,
      };
    }),

  // Generate PDF from generator data
  generateGeneratorPdf: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        format: z.enum(['standard', 'large-print', 'booklet']).default('standard'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify bulletin exists
      const checkQuery = `
        SELECT id, status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const check = await queryWithTenant<{ id: string; status: string }>(
        tenantId,
        checkQuery,
        [input.bulletinId]
      );

      if (check.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      // TODO: Implement actual PDF generation
      // For now, return stub response
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'PDF generation not yet implemented. Coming soon!',
      });
    }),

  // Get preflight validation for bulletin
  getPreflightValidation: protectedProcedure
    .input(z.object({ bulletinId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin exists and get its data
      const bulletinQuery = `
        SELECT id, status, issue_date FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<{ id: string; status: string; issue_date: Date }>(
        tenantId,
        bulletinQuery,
        [input.bulletinId]
      );

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      // Check for service items with missing CCLI
      const ccliQuery = `
        SELECT COUNT(*) as missing_ccli
        FROM service_item
        WHERE bulletin_issue_id = $1
          AND item_type = 'song'
          AND (ccli_number IS NULL OR ccli_number = '')
          AND deleted_at IS NULL
      `;

      const ccliResult = await queryWithTenant<{ missing_ccli: string }>(
        tenantId,
        ccliQuery,
        [input.bulletinId]
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      const missingCcli = parseInt(ccliResult.rows[0]?.missing_ccli || '0', 10);
      if (missingCcli > 0) {
        errors.push(`${missingCcli} song(s) are missing CCLI numbers`);
      }

      // Check for service items
      const itemsQuery = `
        SELECT COUNT(*) as item_count
        FROM service_item
        WHERE bulletin_issue_id = $1 AND deleted_at IS NULL
      `;

      const itemsResult = await queryWithTenant<{ item_count: string }>(
        tenantId,
        itemsQuery,
        [input.bulletinId]
      );

      const itemCount = parseInt(itemsResult.rows[0]?.item_count || '0', 10);
      if (itemCount === 0) {
        warnings.push('No service items added to this bulletin');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),

  // Get AI suggestions for bulletin generator
  getGeneratorSuggestions: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        context: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify bulletin exists
      const checkQuery = `
        SELECT id FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const check = await queryWithTenant<{ id: string }>(
        tenantId,
        checkQuery,
        [input.bulletinId]
      );

      if (check.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      // TODO: Implement AI suggestions when AI integration is complete
      // For now, return empty/placeholder suggestions structure that frontend expects
      return {
        suggestions: [] as { type: string; content: string; confidence: number }[],
        sermons: [] as { id: string; title: string; passage: string; description: string; preacher: string; primaryScripture: string; seriesTitle: string | null }[],
        announcements: [] as { id: string; title: string; body: string; category: string; priority: 'high' | 'normal' | 'low' }[],
        events: [] as { id: string; title: string; date: string; time: string; location: string; locationName: string; startAt: string; allDay: boolean }[],
        generatedAt: new Date().toISOString(),
      };
    }),

  // Get service templates
  getServiceTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if service_template table exists by trying to query it
      try {
        const queryText = `
          SELECT id, name, description, default_items
          FROM service_template
          WHERE tenant_id = $1 AND deleted_at IS NULL
          ORDER BY name
        `;

        const result = await queryWithTenant<{
          id: string;
          name: string;
          description: string | null;
          default_items: unknown;
        }>(tenantId, queryText, [tenantId]);

        // Return array directly (frontend expects to call .find(), .map(), etc.)
        return result.rows.map((row) => {
          const items = row.default_items as { type: string; title?: string; orderIndex: number }[] || [];
          return {
            key: row.id,
            name: row.name,
            description: row.description,
            defaultItems: items,
            sectionCount: 1, // Default to single section
            sections: [{ id: '1', name: 'Main Service', type: 'main', label: 'Main Service', items }],
          };
        });
      } catch {
        // Table doesn't exist yet, return default templates
        const defaultItems = [
          { type: 'prelude', title: 'Prelude', orderIndex: 0 },
          { type: 'call_to_worship', title: 'Call to Worship', orderIndex: 1 },
          { type: 'song', title: 'Opening Hymn', orderIndex: 2 },
          { type: 'prayer', title: 'Prayer', orderIndex: 3 },
          { type: 'scripture', title: 'Scripture Reading', orderIndex: 4 },
          { type: 'sermon', title: 'Sermon', orderIndex: 5 },
          { type: 'song', title: 'Closing Hymn', orderIndex: 6 },
          { type: 'benediction', title: 'Benediction', orderIndex: 7 },
        ];
        return [
          {
            key: 'default-sunday',
            name: 'Sunday Morning Service',
            description: 'Standard Sunday morning worship service order',
            defaultItems,
            sectionCount: 1,
            sections: [{ id: '1', name: 'Main Service', type: 'main', label: 'Main Service', items: defaultItems }],
          },
        ];
      }
    }),

  // Generate bulletin from content (alternative generation method)
  generateFromContent: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        content: z.record(z.unknown()),
        serviceDate: z.string().optional(), // Optional for compatibility
        serviceLabel: z.string().optional(), // Optional for compatibility
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify bulletin exists and is not locked
      const checkQuery = `
        SELECT id, status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const check = await queryWithTenant<{ id: string; status: string }>(
        tenantId,
        checkQuery,
        [input.bulletinId]
      );

      if (check.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (check.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot generate for locked bulletin',
        });
      }

      // TODO: Implement actual content-based generation
      return {
        success: true,
        id: input.bulletinId,
        bulletinId: input.bulletinId,
        generatedAt: new Date().toISOString(),
      };
    }),

  // Create bulletin from previous week
  createFromPrevious: protectedProcedure
    .input(
      z.object({
        previousBulletinId: z.string().uuid(),
        newServiceDate: z.string().datetime(),
        serviceDate: z.string().optional(), // Alias for compatibility
        templateKey: z.string().optional(), // Optional template to use
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get previous bulletin
      const prevQuery = `
        SELECT
          brand_pack_id,
          template_key,
          design_options,
          use_canvas_layout
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const prevResult = await queryWithTenant<BulletinIssue>(
        tenantId,
        prevQuery,
        [input.previousBulletinId]
      );

      if (prevResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Previous bulletin not found',
        });
      }

      const prev = prevResult.rows[0];
      const newDate = new Date(input.newServiceDate);

      // Check if bulletin already exists for new date
      const existingQuery = `
        SELECT id FROM bulletin_issue
        WHERE issue_date = $1 AND deleted_at IS NULL
      `;

      const existing = await queryWithTenant(tenantId, existingQuery, [newDate]);

      if (existing.rows.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bulletin already exists for this service date',
        });
      }

      // Create new bulletin with settings from previous
      const insertQuery = `
        INSERT INTO bulletin_issue (
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          template_key,
          design_options,
          use_canvas_layout
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id,
          issue_date,
          status,
          brand_pack_id,
          template_key,
          design_options,
          use_canvas_layout,
          created_at,
          updated_at
      `;

      const result = await queryWithTenant<BulletinIssue>(
        tenantId,
        insertQuery,
        [
          tenantId,
          newDate,
          'draft',
          prev.brand_pack_id,
          prev.template_key,
          prev.design_options,
          prev.use_canvas_layout,
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        serviceDate: row.issue_date,
        status: row.status,
        brandPackId: row.brand_pack_id,
        templateKey: row.template_key,
        designOptions: row.design_options,
        useCanvasLayout: row.use_canvas_layout,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  // Copy settings from another bulletin
  copyFromBulletin: protectedProcedure
    .input(
      z.object({
        targetBulletinId: z.string().uuid(),
        sourceBulletinId: z.string().uuid(),
        copyServiceItems: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify target bulletin exists and is not locked
      const targetQuery = `
        SELECT id, status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const targetResult = await queryWithTenant<{ id: string; status: string }>(
        tenantId,
        targetQuery,
        [input.targetBulletinId]
      );

      if (targetResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target bulletin not found',
        });
      }

      if (targetResult.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify locked bulletin',
        });
      }

      // Get source bulletin settings
      const sourceQuery = `
        SELECT
          brand_pack_id,
          template_key,
          design_options,
          use_canvas_layout,
          canvas_layout_json
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const sourceResult = await queryWithTenant<BulletinIssue>(
        tenantId,
        sourceQuery,
        [input.sourceBulletinId]
      );

      if (sourceResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source bulletin not found',
        });
      }

      const source = sourceResult.rows[0];

      // Copy settings to target
      const updateQuery = `
        UPDATE bulletin_issue
        SET brand_pack_id = $2,
            template_key = $3,
            design_options = $4,
            use_canvas_layout = $5,
            canvas_layout_json = $6,
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(
        tenantId,
        updateQuery,
        [
          input.targetBulletinId,
          source.brand_pack_id,
          source.template_key,
          source.design_options,
          source.use_canvas_layout,
          source.canvas_layout_json,
        ]
      );

      // Optionally copy service items
      if (input.copyServiceItems) {
        // Copy service items from source to target
        const copyItemsQuery = `
          INSERT INTO service_item (
            tenant_id,
            bulletin_issue_id,
            item_type,
            title,
            description,
            order_index,
            duration_minutes,
            leader_name,
            song_id,
            ccli_number,
            scripture_reference,
            notes
          )
          SELECT
            tenant_id,
            $2,
            item_type,
            title,
            description,
            order_index,
            duration_minutes,
            leader_name,
            song_id,
            ccli_number,
            scripture_reference,
            notes
          FROM service_item
          WHERE bulletin_issue_id = $1 AND deleted_at IS NULL
        `;

        await queryWithTenant(tenantId, copyItemsQuery, [
          input.sourceBulletinId,
          input.targetBulletinId,
        ]);
      }

      return { success: true };
    }),

  // Save canvas layout
  saveCanvasLayout: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        canvasLayout: z.record(z.unknown()),
        useCanvasLayout: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.bulletinId]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked bulletin',
        });
      }

      const updateQuery = `
        UPDATE bulletin_issue
        SET canvas_layout_json = $2,
            use_canvas_layout = $3,
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(
        tenantId,
        updateQuery,
        [input.bulletinId, input.canvasLayout, input.useCanvasLayout]
      );

      return { success: true };
    }),

  // Update design options
  updateDesignOptions: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        designOptions: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.bulletinId]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked bulletin',
        });
      }

      const updateQuery = `
        UPDATE bulletin_issue
        SET design_options = $2,
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(tenantId, updateQuery, [input.bulletinId, input.designOptions]);

      return { success: true };
    }),

  // Update template key
  updateTemplateKey: protectedProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        templateKey: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if bulletin is locked
      const lockCheckQuery = `
        SELECT status FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const lockCheck = await queryWithTenant<{ status: string }>(
        tenantId,
        lockCheckQuery,
        [input.bulletinId]
      );

      if (lockCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      if (lockCheck.rows[0].status === 'locked') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked bulletin',
        });
      }

      const updateQuery = `
        UPDATE bulletin_issue
        SET template_key = $2,
            updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `;

      await queryWithTenant(tenantId, updateQuery, [input.bulletinId, input.templateKey]);

      return { success: true };
    }),
});

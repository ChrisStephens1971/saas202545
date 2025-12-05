import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { queryWithTenant } from '../db';
import { getOrgBranding, OrgBranding } from '../lib/orgBranding';
import { WebsiteSchema } from '@elder-first/types';

export const orgRouter = router({
  /**
   * Get current organization branding
   * Available to all authenticated users with tenant context
   */
  getBranding: protectedProcedure.query(async ({ ctx }): Promise<OrgBranding> => {
    const tenantId = ctx.tenantId!;
    return getOrgBranding(tenantId);
  }),

  /**
   * Update organization branding
   * Admin only - updates the active brand_pack for the tenant
   */
  updateBranding: adminProcedure
    .input(
      z.object({
        legalName: z.string().min(1, 'Legal name is required').max(255),
        churchName: z.string().max(255).optional().nullable(),
        addressLine1: z.string().max(255).optional().nullable(),
        addressLine2: z.string().max(255).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        state: z.string().max(50).optional().nullable(),
        postalCode: z.string().max(20).optional().nullable(),
        country: z.string().max(50).optional().nullable(),
        phone: z.string().max(50).optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal('')),
        website: WebsiteSchema, // Normalizes hostnames like "mychurch.org" to "https://mychurch.org"
        ein: z.string().max(20).optional().nullable(),
        logoUrl: z.string().url().optional().nullable().or(z.literal('')),
        taxStatementFooter: z.string().max(1000).optional().nullable(),
        // Bulletin settings
        bulletinDefaultLayoutMode: z.enum(['template', 'canvas']).optional(),
        bulletinAiEnabled: z.boolean().optional(),
        bulletinDefaultCanvasGridSize: z.number().int().positive().optional(),
        bulletinDefaultCanvasShowGrid: z.boolean().optional(),
        bulletinDefaultPages: z.number().int().min(1).max(4).optional(),
        givingUrl: z.string().url().optional().nullable().or(z.literal('')),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Check if there's an active brand_pack
      const existingResult = await queryWithTenant(
        tenantId,
        `SELECT id FROM brand_pack WHERE is_active = true AND deleted_at IS NULL LIMIT 1`
      );

      // Clean up empty strings to null
      const cleanInput = {
        legal_name: input.legalName,
        church_name: input.churchName || null,
        address_line1: input.addressLine1 || null,
        address_line2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        postal_code: input.postalCode || null,
        country: input.country || 'US',
        church_phone: input.phone || null,
        church_email: input.email || null,
        church_website: input.website || null,
        ein: input.ein || null,
        logo_url: input.logoUrl || null,
        tax_statement_footer: input.taxStatementFooter || null,
        bulletin_default_layout_mode: input.bulletinDefaultLayoutMode || 'template',
        bulletin_ai_enabled: input.bulletinAiEnabled ?? false,
        bulletin_default_canvas_grid_size: input.bulletinDefaultCanvasGridSize ?? 16,
        bulletin_default_canvas_show_grid: input.bulletinDefaultCanvasShowGrid ?? true,
        bulletin_default_pages: input.bulletinDefaultPages ?? 4,
        giving_url: input.givingUrl || null,
      };

      if (existingResult.rows.length === 0) {
        // Create a new brand_pack with is_active = true
        await queryWithTenant(
          tenantId,
          `INSERT INTO brand_pack (
            tenant_id,
            name,
            is_active,
            legal_name,
            church_name,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            church_phone,
            church_email,
            church_website,
            ein,
            logo_url,
            tax_statement_footer,
            bulletin_default_layout_mode,
            bulletin_ai_enabled,
            bulletin_default_canvas_grid_size,
            bulletin_default_canvas_show_grid,
            bulletin_default_pages,
            giving_url,
            created_at,
            updated_at
          ) VALUES (
            $1, 'Default', true,
            $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21,
            NOW(), NOW()
          )`,
          [
            tenantId,
            cleanInput.legal_name,
            cleanInput.church_name,
            cleanInput.address_line1,
            cleanInput.address_line2,
            cleanInput.city,
            cleanInput.state,
            cleanInput.postal_code,
            cleanInput.country,
            cleanInput.church_phone,
            cleanInput.church_email,
            cleanInput.church_website,
            cleanInput.ein,
            cleanInput.logo_url,
            cleanInput.tax_statement_footer,
            cleanInput.bulletin_default_layout_mode,
            cleanInput.bulletin_ai_enabled,
            cleanInput.bulletin_default_canvas_grid_size,
            cleanInput.bulletin_default_canvas_show_grid,
            cleanInput.bulletin_default_pages,
            cleanInput.giving_url,
          ]
        );
      } else {
        // Update existing active brand_pack
        const brandPackId = existingResult.rows[0].id;
        await queryWithTenant(
          tenantId,
          `UPDATE brand_pack SET
            legal_name = $2,
            church_name = $3,
            address_line1 = $4,
            address_line2 = $5,
            city = $6,
            state = $7,
            postal_code = $8,
            country = $9,
            church_phone = $10,
            church_email = $11,
            church_website = $12,
            ein = $13,
            logo_url = $14,
            tax_statement_footer = $15,
            bulletin_default_layout_mode = $16,
            bulletin_ai_enabled = $17,
            bulletin_default_canvas_grid_size = $18,
            bulletin_default_canvas_show_grid = $19,
            bulletin_default_pages = $20,
            giving_url = $21,
            updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL`,
          [
            brandPackId,
            cleanInput.legal_name,
            cleanInput.church_name,
            cleanInput.address_line1,
            cleanInput.address_line2,
            cleanInput.city,
            cleanInput.state,
            cleanInput.postal_code,
            cleanInput.country,
            cleanInput.church_phone,
            cleanInput.church_email,
            cleanInput.church_website,
            cleanInput.ein,
            cleanInput.logo_url,
            cleanInput.tax_statement_footer,
            cleanInput.bulletin_default_layout_mode,
            cleanInput.bulletin_ai_enabled,
            cleanInput.bulletin_default_canvas_grid_size,
            cleanInput.bulletin_default_canvas_show_grid,
            cleanInput.bulletin_default_pages,
            cleanInput.giving_url,
          ]
        );
      }

      // Return updated branding
      return getOrgBranding(tenantId);
    }),
});

import { router, publicProcedure, platformAdminProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { logger } from '../utils/logger';
import { TRPCError } from '@trpc/server';

// Type for seed songs result (defined locally to avoid rootDir issues with path mappings)
interface SeedSongsResult {
  created: number;
  updated: number;
  errors: number;
  total: number;
}

// Dynamic import for seed function to avoid rootDir issues with TypeScript path mappings
async function seedSongsForTenant(pool: typeof db, tenantId: string): Promise<SeedSongsResult> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { seedSongsForTenant: seedFn } = require('@elder-first/database/src/seed-songs');
  return seedFn(pool, tenantId);
}

/**
 * Tenants router for tenant management operations.
 *
 * SECURITY MODEL:
 * - Tenant creation requires platform_admin role (internal-only)
 * - Public self-signup is NOT supported
 * - Read operations (getBySlug, checkSlugAvailability) are public for UX
 *
 * Future operations may include:
 * - update: Update tenant settings (platform_admin only)
 * - deactivate: Soft-delete a tenant (platform_admin only)
 * - list: List all tenants (platform_admin only)
 */
export const tenantsRouter = router({
  /**
   * Create a new tenant.
   *
   * SECURITY: Requires platform_admin role.
   *
   * This is called by platform administrators when onboarding a new church.
   * It creates the tenant record and seeds the default song library.
   *
   * The song seeding is non-blocking - if it fails, the tenant is still created
   * and the failure is logged for later investigation.
   */
  create: platformAdminProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(3, 'Slug must be at least 3 characters')
          .max(50, 'Slug must be at most 50 characters')
          .regex(
            /^[a-z0-9-]+$/,
            'Slug must contain only lowercase letters, numbers, and hyphens'
          ),
        name: z.string().min(1, 'Name is required').max(255),
        primaryEmail: z.string().email('Invalid email address'),
        timezone: z.string().default('America/New_York'),
        locale: z.string().default('en-US'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info('Tenant creation initiated by platform admin', {
        adminUserId: ctx.userId,
        slug: input.slug,
      });

      // Check if slug is already taken
      const existingTenant = await db.query(
        'SELECT id FROM tenant WHERE slug = $1',
        [input.slug]
      );

      if (existingTenant.rows.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Tenant with slug "${input.slug}" already exists`,
        });
      }

      // Create the tenant
      const result = await db.query(
        `INSERT INTO tenant (slug, name, status, primary_email, timezone, locale)
         VALUES ($1, $2, 'active', $3, $4, $5)
         RETURNING id, slug, name, status, primary_email, timezone, locale, created_at`,
        [input.slug, input.name, input.primaryEmail, input.timezone, input.locale]
      );

      const newTenant = result.rows[0];

      logger.info('Tenant created successfully', {
        tenantId: newTenant.id,
        slug: newTenant.slug,
        name: newTenant.name,
        createdBy: ctx.userId,
      });

      // Seed default songs for the tenant (non-blocking)
      // This is fire-and-forget - we don't wait for it to complete
      // and failures don't affect the tenant creation response
      seedSongsForTenant(db, newTenant.id)
        .then((seedResult: SeedSongsResult) => {
          logger.info('Songs seeded for new tenant', {
            tenantId: newTenant.id,
            created: seedResult.created,
            updated: seedResult.updated,
            errors: seedResult.errors,
          });
        })
        .catch((err: Error) => {
          // Log the error but don't throw - tenant creation was successful
          logger.warn('Song seeding failed for tenant', {
            tenantId: newTenant.id,
            error: err.message,
          });
        });

      // Return the created tenant (without waiting for song seeding)
      return {
        id: newTenant.id,
        slug: newTenant.slug,
        name: newTenant.name,
        status: newTenant.status,
        primaryEmail: newTenant.primary_email,
        timezone: newTenant.timezone,
        locale: newTenant.locale,
        createdAt: newTenant.created_at,
      };
    }),

  /**
   * Get a tenant by slug (for onboarding flow).
   * Returns null if not found rather than throwing.
   *
   * This is a public endpoint to allow checking tenant existence
   * before login (e.g., subdomain routing).
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const result = await db.query(
        `SELECT id, slug, name, status, timezone, locale, created_at
         FROM tenant
         WHERE slug = $1`,
        [input.slug]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = result.rows[0];
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        timezone: tenant.timezone,
        locale: tenant.locale,
        createdAt: tenant.created_at,
      };
    }),

  /**
   * Check if a slug is available.
   *
   * This is a public endpoint to provide real-time feedback
   * during tenant setup forms.
   */
  checkSlugAvailability: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const result = await db.query(
        'SELECT id FROM tenant WHERE slug = $1',
        [input.slug]
      );

      return {
        available: result.rows.length === 0,
        slug: input.slug,
      };
    }),
});

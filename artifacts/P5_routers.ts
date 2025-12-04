/**
 * Elder-First Church Platform - tRPC Routers (V1)
 *
 * This file defines all tRPC routers with Zod validation schemas
 * and example handler implementations.
 *
 * Stack: tRPC v11 + Zod + Prisma + PostgreSQL RLS
 */

import { z } from 'zod';
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

// ============================================================================
// tRPC Initialization
// ============================================================================

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ============================================================================
// Middleware
// ============================================================================

/**
 * Middleware: Require authentication
 */
const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type narrowing: user is now non-null
    },
  });
});

/**
 * Middleware: Require specific roles
 */
const requireRole = (roles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Required role: ${roles.join(' or ')}. Current role: ${ctx.user.role}`,
      });
    }

    return next({ ctx });
  });

const authedProcedure = t.procedure.use(requireAuth);
const adminProcedure = t.procedure.use(requireAuth).use(requireRole(['Admin']));
const editorProcedure = t.procedure
  .use(requireAuth)
  .use(requireRole(['Admin', 'Editor']));

// ============================================================================
// Shared Zod Schemas
// ============================================================================

const UUIDSchema = z.string().uuid();
const DateSchema = z.coerce.date();

// ============================================================================
// Router 1: People & Households
// ============================================================================

const peopleRouter = router({
  /**
   * Search people by name, email, phone
   */
  search: authedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(100),
        limit: z.number().int().min(1).max(50).default(10),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Set tenant context for RLS
      await db.$executeRaw`SELECT set_config('app.tenant_id', ${user.tenantId}, false)`;

      const results = await db.$queryRaw`
        SELECT
          p.id, p.first_name, p.last_name, p.email, p.phone, p.photo_url,
          p.membership_status, p.member_since,
          h.id as household_id, h.name as household_name, h.address_line1
        FROM person p
        LEFT JOIN household h ON p.household_id = h.id
        WHERE
          p.tenant_id = ${user.tenantId}::uuid
          AND p.deleted_at IS NULL
          AND (
            p.first_name || ' ' || p.last_name ILIKE ${'%' + input.query + '%'}
            OR p.email ILIKE ${'%' + input.query + '%'}
            OR p.phone ILIKE ${'%' + input.query + '%'}
          )
        ORDER BY p.last_name, p.first_name
        LIMIT ${input.limit}
        OFFSET ${input.offset}
      `;

      return { results, total: results.length };
    }),

  /**
   * Get person by ID with household details
   */
  get: authedProcedure
    .input(z.object({ id: UUIDSchema }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      await db.$executeRaw`SELECT set_config('app.tenant_id', ${user.tenantId}, false)`;

      const person = await db.person.findFirst({
        where: {
          id: input.id,
          tenant_id: user.tenantId,
          deleted_at: null,
        },
        include: {
          household: true,
        },
      });

      if (!person) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        });
      }

      return person;
    }),

  /**
   * Create or update person
   */
  upsert: editorProcedure
    .input(
      z.object({
        id: UUIDSchema.optional(),
        household_id: UUIDSchema.optional(),
        first_name: z.string().min(1).max(100),
        last_name: z.string().min(1).max(100),
        email: z.string().email().max(255).optional(),
        phone: z.string().max(50).optional(),
        date_of_birth: DateSchema.optional(),
        gender: z.string().max(50).optional(),
        membership_status: z.enum(['member', 'attendee', 'visitor']).optional(),
        member_since: DateSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      await db.$executeRaw`SELECT set_config('app.tenant_id', ${user.tenantId}, false)`;

      const person = await db.person.upsert({
        where: { id: input.id || '' },
        create: {
          tenant_id: user.tenantId,
          ...input,
        },
        update: input,
      });

      return person;
    }),

  /**
   * List households with member count
   */
  listHouseholds: authedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      await db.$executeRaw`SELECT set_config('app.tenant_id', ${user.tenantId}, false)`;

      const households = await db.household.findMany({
        where: {
          tenant_id: user.tenantId,
          deleted_at: null,
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
        take: input.limit,
        skip: input.offset,
        orderBy: { name: 'asc' },
      });

      return households;
    }),
});

// ============================================================================
// Router 2: Events & RSVP
// ============================================================================

const eventsRouter = router({
  /**
   * List events by date range
   */
  list: publicProcedure
    .input(
      z.object({
        startDate: DateSchema.optional(),
        endDate: DateSchema.optional(),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const tenantId = user?.tenantId || ctx.tenantIdFromDomain;

      const events = await db.event.findMany({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          is_public: true,
          start_at: {
            gte: input.startDate || new Date(),
            lte: input.endDate,
          },
        },
        orderBy: { start_at: 'asc' },
        take: input.limit,
        include: {
          _count: {
            select: { rsvps: { where: { response: 'Yes' } } },
          },
        },
      });

      return events;
    }),

  /**
   * Get event with RSVP list
   */
  get: authedProcedure
    .input(z.object({ id: UUIDSchema }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const event = await db.event.findFirst({
        where: {
          id: input.id,
          tenant_id: user.tenantId,
          deleted_at: null,
        },
        include: {
          rsvps: {
            include: {
              person: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      return event;
    }),

  /**
   * Create event
   */
  create: editorProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        start_at: DateSchema,
        end_at: DateSchema.optional(),
        all_day: z.boolean().default(false),
        location_name: z.string().max(255).optional(),
        location_address: z.string().max(500).optional(),
        is_public: z.boolean().default(true),
        allow_rsvp: z.boolean().default(true),
        rsvp_limit: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const event = await db.event.create({
        data: {
          tenant_id: user.tenantId,
          ...input,
        },
      });

      return event;
    }),

  /**
   * Update event
   */
  update: editorProcedure
    .input(
      z.object({
        id: UUIDSchema,
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        start_at: DateSchema.optional(),
        end_at: DateSchema.optional(),
        location_name: z.string().max(255).optional(),
        is_public: z.boolean().optional(),
        rsvp_limit: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { id, ...updateData } = input;

      const event = await db.event.updateMany({
        where: {
          id,
          tenant_id: user.tenantId,
          deleted_at: null,
        },
        data: updateData,
      });

      if (event.count === 0) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return { success: true };
    }),

  /**
   * RSVP to event
   */
  rsvp: authedProcedure
    .input(
      z.object({
        event_id: UUIDSchema,
        response: z.enum(['Yes', 'No', 'Maybe']),
        headcount: z.number().int().min(1).max(20).default(1),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Check event exists and is within RSVP limit
      const event = await db.event.findFirst({
        where: {
          id: input.event_id,
          tenant_id: user.tenantId,
          deleted_at: null,
        },
        include: {
          _count: {
            select: { rsvps: { where: { response: 'Yes' } } },
          },
        },
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      if (
        event.rsvp_limit &&
        input.response === 'Yes' &&
        event._count.rsvps >= event.rsvp_limit
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'RSVP limit reached',
          cause: { limit: event.rsvp_limit, current: event._count.rsvps },
        });
      }

      // Upsert RSVP
      const rsvp = await db.rsvp.upsert({
        where: {
          event_id_person_id: {
            event_id: input.event_id,
            person_id: user.id,
          },
        },
        create: {
          tenant_id: user.tenantId,
          event_id: input.event_id,
          person_id: user.id,
          response: input.response,
          headcount: input.headcount,
          notes: input.notes,
        },
        update: {
          response: input.response,
          headcount: input.headcount,
          notes: input.notes,
        },
      });

      return rsvp;
    }),
});

// ============================================================================
// Router 3: Announcements
// ============================================================================

const announcementsRouter = router({
  /**
   * List active announcements (not expired, ordered by priority)
   */
  listActive: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const tenantId = user?.tenantId || ctx.tenantIdFromDomain;

      const announcements = await db.announcement.findMany({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          is_active: true,
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
        orderBy: [{ priority: 'desc' }, { starts_at: 'desc' }],
        take: input.limit,
        include: {
          submitted_by: {
            select: { first_name: true, last_name: true },
          },
        },
      });

      return announcements;
    }),

  /**
   * Create announcement (auto-approve for Editor/Admin)
   */
  create: authedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(60),
        body: z.string().min(1).max(300),
        priority: z.enum(['Urgent', 'High', 'Normal']).default('Normal'),
        category: z.string().max(100).optional(),
        expires_at: DateSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const autoApprove = ['Admin', 'Editor'].includes(user.role);

      const announcement = await db.announcement.create({
        data: {
          tenant_id: user.tenantId,
          submitted_by: user.id,
          approved_by: autoApprove ? user.id : null,
          approved_at: autoApprove ? new Date() : null,
          ...input,
        },
      });

      return announcement;
    }),

  /**
   * Approve announcement (Editor/Admin only)
   */
  approve: editorProcedure
    .input(z.object({ id: UUIDSchema }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const announcement = await db.announcement.updateMany({
        where: {
          id: input.id,
          tenant_id: user.tenantId,
          deleted_at: null,
          approved_at: null, // Only approve pending
        },
        data: {
          approved_by: user.id,
          approved_at: new Date(),
        },
      });

      if (announcement.count === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found or already approved',
        });
      }

      return { success: true };
    }),
});

// ============================================================================
// Router 4: Services (Order of Worship)
// ============================================================================

const servicesRouter = router({
  /**
   * Get service items for a specific date
   */
  listByDate: authedProcedure
    .input(z.object({ service_date: DateSchema }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const items = await db.service_item.findMany({
        where: {
          tenant_id: user.tenantId,
          service_date: input.service_date,
          deleted_at: null,
        },
        orderBy: { sequence: 'asc' },
      });

      return items;
    }),

  /**
   * Bulk upsert service items (idempotent)
   */
  upsertItems: editorProcedure
    .input(
      z.object({
        service_date: DateSchema,
        items: z.array(
          z.object({
            type: z.enum([
              'Welcome',
              'CallToWorship',
              'Song',
              'Prayer',
              'Scripture',
              'Sermon',
              'Offering',
              'Communion',
              'Benediction',
              'Announcement',
              'Other',
            ]),
            sequence: z.number().int().min(1),
            title: z.string().max(255).optional(),
            content: z.string().optional(),
            ccli_number: z.string().max(50).optional(),
            artist: z.string().max(255).optional(),
            scripture_ref: z.string().max(100).optional(),
            speaker: z.string().max(255).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Delete existing items for this date, then insert new
      await db.service_item.deleteMany({
        where: {
          tenant_id: user.tenantId,
          service_date: input.service_date,
        },
      });

      const items = await db.service_item.createMany({
        data: input.items.map((item) => ({
          tenant_id: user.tenantId,
          service_date: input.service_date,
          ...item,
        })),
      });

      return { created: items.count };
    }),

  /**
   * Validate all songs have CCLI numbers (for bulletin lock)
   */
  enforceCCLI: authedProcedure
    .input(z.object({ service_date: DateSchema }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const songsWithoutCCLI = await db.service_item.findMany({
        where: {
          tenant_id: user.tenantId,
          service_date: input.service_date,
          type: 'Song',
          OR: [{ ccli_number: null }, { ccli_number: '' }],
          deleted_at: null,
        },
        select: { id: true, title: true },
      });

      if (songsWithoutCCLI.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `${songsWithoutCCLI.length} songs missing CCLI numbers`,
          cause: { missingCCLI: songsWithoutCCLI },
        });
      }

      return { valid: true };
    }),
});

// ============================================================================
// Router 5: Brand Pack
// ============================================================================

const brandpackRouter = router({
  /**
   * Get active brand pack
   */
  getActive: authedProcedure.query(async ({ ctx }) => {
    const { db, user } = ctx;

    const brandPack = await db.brand_pack.findFirst({
      where: {
        tenant_id: user.tenantId,
        is_active: true,
        deleted_at: null,
      },
    });

    if (!brandPack) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active brand pack found',
      });
    }

    return brandPack;
  }),

  /**
   * Create brand pack
   */
  create: editorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        logo_url: z.string().url().optional(),
        primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        font_family: z.string().max(100).default('Inter'),
        church_name: z.string().max(255).optional(),
        church_address: z.string().max(500).optional(),
        church_phone: z.string().max(50).optional(),
        church_email: z.string().email().optional(),
        church_website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const brandPack = await db.brand_pack.create({
        data: {
          tenant_id: user.tenantId,
          ...input,
        },
      });

      return brandPack;
    }),
});

// ============================================================================
// Router 6: Bulletin Generator
// ============================================================================

const bulletinRouter = router({
  /**
   * Create bulletin issue for a Sunday
   */
  createIssue: editorProcedure
    .input(
      z.object({
        issue_date: DateSchema,
        brand_pack_id: UUIDSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Check if issue already exists for this date
      const existing = await db.bulletin_issue.findFirst({
        where: {
          tenant_id: user.tenantId,
          issue_date: input.issue_date,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bulletin already exists for this date',
        });
      }

      const issue = await db.bulletin_issue.create({
        data: {
          tenant_id: user.tenantId,
          issue_date: input.issue_date,
          brand_pack_id: input.brand_pack_id,
          status: 'draft',
        },
      });

      return issue;
    }),

  /**
   * Build preview (watermarked PROOF)
   */
  buildPreview: editorProcedure
    .input(z.object({ issue_id: UUIDSchema }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Get issue
      const issue = await db.bulletin_issue.findFirst({
        where: {
          id: input.issue_id,
          tenant_id: user.tenantId,
        },
      });

      if (!issue) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // TODO: Call render service
      // const artifacts = await renderService.buildPreview(issue_id);

      // Update status
      await db.bulletin_issue.update({
        where: { id: input.issue_id },
        data: {
          status: 'built',
          // pdf_url: artifacts.pdf_url + '?watermark=PROOF',
        },
      });

      return { success: true, message: 'Preview build started' };
    }),

  /**
   * Lock bulletin (Admin only, removes watermark, immutable)
   */
  lock: adminProcedure
    .input(z.object({ issue_id: UUIDSchema }))
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Get issue with all related data
      const issue = await db.bulletin_issue.findFirst({
        where: {
          id: input.issue_id,
          tenant_id: user.tenantId,
        },
        include: {
          service_items: true,
          announcements: true,
        },
      });

      if (!issue) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Validate state
      if (issue.status !== 'built') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Bulletin must be in 'built' state. Current: ${issue.status}`,
        });
      }

      // Validate CCLI (call services.enforceCCLI internally)
      const songsWithoutCCLI = issue.service_items.filter(
        (item) => item.type === 'Song' && !item.ccli_number
      );

      if (songsWithoutCCLI.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `${songsWithoutCCLI.length} songs missing CCLI`,
          cause: { missingCCLI: songsWithoutCCLI.map((s) => s.title) },
        });
      }

      // Generate content hash
      const contentHash = await hashContent(issue);

      // Lock issue
      const locked = await db.bulletin_issue.update({
        where: { id: input.issue_id },
        data: {
          status: 'locked',
          locked_at: new Date(),
          locked_by: user.id,
          content_hash: contentHash,
        },
      });

      // TODO: Render final artifacts without watermark
      // const artifacts = await renderService.buildFinal(issue_id);

      return { success: true, locked };
    }),

  /**
   * Emergency reopen (Admin only, adds timestamp watermark)
   */
  reopenEmergency: adminProcedure
    .input(
      z.object({
        issue_id: UUIDSchema,
        reason: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const issue = await db.bulletin_issue.findFirst({
        where: {
          id: input.issue_id,
          tenant_id: user.tenantId,
          status: 'locked',
        },
      });

      if (!issue) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Locked bulletin not found',
        });
      }

      await db.bulletin_issue.update({
        where: { id: input.issue_id },
        data: {
          reopened_at: new Date(),
          reopened_by: user.id,
          reopen_reason: input.reason,
          status: 'draft', // Back to draft for edits
        },
      });

      // Log to audit
      await db.audit_log.create({
        data: {
          tenant_id: user.tenantId,
          user_id: user.id,
          action: 'bulletin.emergency_reopen',
          resource_type: 'bulletin_issue',
          resource_id: input.issue_id,
          details: { reason: input.reason },
        },
      });

      return { success: true };
    }),
});

// ============================================================================
// Router 7: Giving (V1 Basic)
// ============================================================================

const givingRouter = router({
  /**
   * Create contribution
   */
  createContribution: authedProcedure
    .input(
      z.object({
        fund_id: UUIDSchema,
        amount_cents: z.number().int().positive(),
        method: z.enum([
          'Card',
          'ACH',
          'Cash',
          'Check',
          'ApplePay',
          'GooglePay',
        ]),
        frequency: z.enum(['OneTime', 'Weekly', 'Monthly']).default('OneTime'),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // TODO: Process payment via Stripe/Plaid

      const contribution = await db.contribution.create({
        data: {
          tenant_id: user.tenantId,
          person_id: user.id,
          ...input,
        },
      });

      // TODO: Send receipt email

      return contribution;
    }),

  /**
   * List active funds
   */
  listFunds: authedProcedure.query(async ({ ctx }) => {
    const { db, user } = ctx;

    const funds = await db.fund.findMany({
      where: {
        tenant_id: user.tenantId,
        is_active: true,
        deleted_at: null,
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });

    return funds;
  }),

  /**
   * Statement export (CSV only for V1)
   */
  statementExport: authedProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2100),
        person_id: UUIDSchema.optional(), // Admin can export for anyone
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const personId = input.person_id || user.id;

      // If exporting for another person, require Admin
      if (personId !== user.id && user.role !== 'Admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const contributions = await db.contribution.findMany({
        where: {
          tenant_id: user.tenantId,
          person_id: personId,
          created_at: {
            gte: new Date(`${input.year}-01-01`),
            lt: new Date(`${input.year + 1}-01-01`),
          },
        },
        include: {
          fund: true,
        },
        orderBy: { created_at: 'asc' },
      });

      // Generate CSV
      const csv = generateCSV(contributions);

      return { csv, total_cents: contributions.reduce((sum, c) => sum + c.amount_cents, 0) };
    }),
});

// ============================================================================
// Router 8: Import
// ============================================================================

const importRouter = router({
  /**
   * Import events from ICS file
   */
  icsUpload: editorProcedure
    .input(
      z.object({
        ics_content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // TODO: Parse ICS, extract events
      // const parsedEvents = parseICS(input.ics_content);

      const report = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      };

      // Idempotent import via external_calendar_id
      // for (const event of parsedEvents) { ... }

      return report;
    }),

  /**
   * Import service items from Planning Center CSV
   */
  planningCenterCsv: editorProcedure
    .input(
      z.object({
        csv_content: z.string().min(1),
        service_date: DateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // TODO: Parse CSV, map columns
      // const items = parsePC_CSV(input.csv_content);

      const report = {
        imported: 0,
        errors: [] as { line: number; message: string }[],
      };

      return report;
    }),
});

// ============================================================================
// App Router (Merge All)
// ============================================================================

export const appRouter = router({
  people: peopleRouter,
  events: eventsRouter,
  announcements: announcementsRouter,
  services: servicesRouter,
  brandpack: brandpackRouter,
  bulletin: bulletinRouter,
  giving: givingRouter,
  import: importRouter,
});

export type AppRouter = typeof appRouter;

// ============================================================================
// Utility Functions
// ============================================================================

async function hashContent(data: any): Promise<string> {
  // TODO: SHA-256 hash of bulletin content
  return 'sha256:placeholder';
}

function generateCSV(data: any[]): string {
  // TODO: CSV generation
  return 'Date,Fund,Amount\n...';
}

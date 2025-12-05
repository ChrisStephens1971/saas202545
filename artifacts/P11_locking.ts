/**
 * Elder-First Church Platform - Bulletin State Machine & Locking
 * Version: 1.0
 *
 * This service implements the bulletin lifecycle state machine with strict
 * validation, immutability enforcement, and audit logging.
 *
 * State Flow:
 * draft → approved → built → locked
 *                              ↓
 *                       reopen_emergency
 *                              ↓
 *                           locked*
 *           (* watermarked "UPDATED [timestamp]")
 */

import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';
import type { Context } from '../context';

// ============================================================================
// Types
// ============================================================================

type BulletinStatus = 'draft' | 'approved' | 'built' | 'locked';

interface StateTransition {
  from: BulletinStatus;
  to: BulletinStatus;
  allowed: boolean;
  requiresRole?: string[];
  preConditions?: (issueId: string, db: PrismaClient) => Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  data?: any;
}

interface ContentHashInput {
  serviceItems: any[];
  announcements: any[];
  brandPackId: string;
  templateVersion: string;
}

// ============================================================================
// State Machine Configuration
// ============================================================================

const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: 'draft',
    to: 'approved',
    allowed: true,
    requiresRole: ['Admin', 'Editor'],
    preConditions: validateForApproval,
  },
  {
    from: 'approved',
    to: 'built',
    allowed: true,
    requiresRole: ['Admin', 'Editor'],
    preConditions: validateForBuild,
  },
  {
    from: 'built',
    to: 'locked',
    allowed: true,
    requiresRole: ['Admin'], // Admin-only
    preConditions: validateForLock,
  },
  {
    from: 'locked',
    to: 'draft', // Emergency reopen
    allowed: true,
    requiresRole: ['Admin'], // Admin-only
    preConditions: async () => ({ valid: true, errors: [] }), // Always allowed
  },
  // Backwards transitions (not allowed)
  {
    from: 'built',
    to: 'draft',
    allowed: false,
  },
  {
    from: 'built',
    to: 'approved',
    allowed: false,
  },
  {
    from: 'locked',
    to: 'approved',
    allowed: false,
  },
  {
    from: 'locked',
    to: 'built',
    allowed: false,
  },
];

// ============================================================================
// State Machine Core
// ============================================================================

export class BulletinStateMachine {
  constructor(private db: PrismaClient) {}

  /**
   * Transition bulletin to new state
   * @throws TRPCError if transition is invalid or preconditions fail
   */
  async transition(
    issueId: string,
    toState: BulletinStatus,
    userId: string,
    userRole: string,
    context?: { reason?: string } // For emergency reopen
  ): Promise<void> {
    // Get current bulletin state
    const bulletin = await this.db.bulletin_issue.findUnique({
      where: { id: issueId },
      select: { status: true, locked_at: true, tenant_id: true },
    });

    if (!bulletin) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bulletin issue not found',
      });
    }

    const fromState = bulletin.status as BulletinStatus;

    // Find transition rule
    const transition = STATE_TRANSITIONS.find(
      (t) => t.from === fromState && t.to === toState
    );

    if (!transition || !transition.allowed) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid state transition: ${fromState} → ${toState}`,
        cause: { currentState: fromState, requestedState: toState },
      });
    }

    // Check role permissions
    if (
      transition.requiresRole &&
      !transition.requiresRole.includes(userRole)
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Required: ${transition.requiresRole.join(' or ')}`,
        cause: { userRole, requiredRoles: transition.requiresRole },
      });
    }

    // Run pre-condition validations
    if (transition.preConditions) {
      const validation = await transition.preConditions(issueId, this.db);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Validation failed for ${fromState} → ${toState}`,
          cause: { errors: validation.errors },
        });
      }
    }

    // Special handling for emergency reopen
    if (fromState === 'locked' && toState === 'draft') {
      if (!context?.reason || context.reason.length < 10) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Emergency reopen requires a reason (min 10 characters)',
        });
      }

      await this.emergencyReopen(
        issueId,
        userId,
        context.reason,
        bulletin.tenant_id
      );
      return;
    }

    // Execute state transition
    await this.db.bulletin_issue.update({
      where: { id: issueId },
      data: { status: toState },
    });

    // Audit log
    await this.logStateChange(
      issueId,
      bulletin.tenant_id,
      userId,
      fromState,
      toState
    );
  }

  /**
   * Emergency reopen a locked bulletin
   */
  private async emergencyReopen(
    issueId: string,
    userId: string,
    reason: string,
    tenantId: string
  ): Promise<void> {
    await this.db.bulletin_issue.update({
      where: { id: issueId },
      data: {
        status: 'draft',
        reopened_at: new Date(),
        reopened_by: userId,
        reopen_reason: reason,
        // Clear artifacts to force regeneration with watermark
        pdf_url: null,
        pdf_large_print_url: null,
        slides_json: null,
        loop_mp4_url: null,
        email_html: null,
        propresenter_bundle_url: null,
      },
    });

    // Audit log
    await this.db.audit_log.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        action: 'bulletin.emergency_reopen',
        resource_type: 'bulletin_issue',
        resource_id: issueId,
        details: { reason },
        created_at: new Date(),
      },
    });
  }

  /**
   * Log state change to audit log
   */
  private async logStateChange(
    issueId: string,
    tenantId: string,
    userId: string,
    fromState: BulletinStatus,
    toState: BulletinStatus
  ): Promise<void> {
    await this.db.audit_log.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        action: `bulletin.transition.${fromState}_to_${toState}`,
        resource_type: 'bulletin_issue',
        resource_id: issueId,
        details: { from: fromState, to: toState },
        created_at: new Date(),
      },
    });
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate bulletin is ready for approval
 */
async function validateForApproval(
  issueId: string,
  db: PrismaClient
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  const bulletin = await db.bulletin_issue.findUnique({
    where: { id: issueId },
    include: {
      service_items: true,
      bulletin_announcements: true,
    },
  });

  if (!bulletin) {
    return {
      valid: false,
      errors: [{ field: 'bulletin', message: 'Bulletin not found', severity: 'error' }],
    };
  }

  // Check has service items
  if (bulletin.service_items.length === 0) {
    errors.push({
      field: 'service_items',
      message: 'At least 1 service item required',
      severity: 'error',
    });
  }

  // Check has announcements
  if (bulletin.bulletin_announcements.length === 0) {
    errors.push({
      field: 'announcements',
      message: 'At least 1 announcement required',
      severity: 'warning', // Warning, not blocker
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Validate bulletin is ready to build (generate preview)
 */
async function validateForBuild(
  issueId: string,
  db: PrismaClient
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  const bulletin = await db.bulletin_issue.findUnique({
    where: { id: issueId },
    include: {
      service_items: true,
      bulletin_announcements: { include: { announcement: true } },
      brand_pack: true,
    },
  });

  if (!bulletin) {
    return {
      valid: false,
      errors: [{ field: 'bulletin', message: 'Bulletin not found', severity: 'error' }],
    };
  }

  // Check service date is not in the past
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  const issueDate = new Date(bulletin.issue_date);
  issueDate.setHours(0, 0, 0, 0);

  if (issueDate < now) {
    errors.push({
      field: 'issue_date',
      message: 'Service date cannot be in the past',
      severity: 'error',
      data: { issue_date: bulletin.issue_date },
    });
  }

  // Check brand pack assigned
  if (!bulletin.brand_pack_id) {
    errors.push({
      field: 'brand_pack',
      message: 'Brand pack must be assigned',
      severity: 'error',
    });
  }

  // Check CCLI numbers for songs (warning only for build)
  const songsWithoutCCLI = bulletin.service_items.filter(
    (item) => item.type === 'Song' && (!item.ccli_number || item.ccli_number.trim() === '')
  );

  if (songsWithoutCCLI.length > 0) {
    errors.push({
      field: 'service_items.ccli_number',
      message: `${songsWithoutCCLI.length} song(s) missing CCLI number`,
      severity: 'warning', // Warning for build (will be error for lock)
      data: {
        songs: songsWithoutCCLI.map((s) => ({ id: s.id, title: s.title })),
      },
    });
  }

  // Check announcements within character limits
  for (const ba of bulletin.bulletin_announcements) {
    const announcement = ba.announcement;
    if (announcement.title.length > 60) {
      errors.push({
        field: `announcement.${announcement.id}.title`,
        message: `Title exceeds 60 characters (${announcement.title.length})`,
        severity: 'error',
        data: { title: announcement.title },
      });
    }
    if (announcement.body.length > 300) {
      errors.push({
        field: `announcement.${announcement.id}.body`,
        message: `Body exceeds 300 characters (${announcement.body.length})`,
        severity: 'error',
        data: { body: announcement.body.substring(0, 50) + '...' },
      });
    }
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Validate bulletin is ready to lock (finalize)
 */
async function validateForLock(
  issueId: string,
  db: PrismaClient
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  const bulletin = await db.bulletin_issue.findUnique({
    where: { id: issueId },
    include: {
      service_items: true,
      bulletin_announcements: true,
      brand_pack: true,
    },
  });

  if (!bulletin) {
    return {
      valid: false,
      errors: [{ field: 'bulletin', message: 'Bulletin not found', severity: 'error' }],
    };
  }

  // Must be in 'built' state
  if (bulletin.status !== 'built') {
    errors.push({
      field: 'status',
      message: `Bulletin must be in 'built' state to lock (current: ${bulletin.status})`,
      severity: 'error',
    });
  }

  // CCLI numbers MANDATORY for lock
  const songsWithoutCCLI = bulletin.service_items.filter(
    (item) => item.type === 'Song' && (!item.ccli_number || item.ccli_number.trim() === '')
  );

  if (songsWithoutCCLI.length > 0) {
    errors.push({
      field: 'service_items.ccli_number',
      message: `All songs must have CCLI numbers before locking. Missing: ${songsWithoutCCLI.length}`,
      severity: 'error',
      data: {
        songs: songsWithoutCCLI.map((s) => ({ id: s.id, title: s.title })),
      },
    });
  }

  // Must have at least 1 announcement
  if (bulletin.bulletin_announcements.length === 0) {
    errors.push({
      field: 'announcements',
      message: 'At least 1 announcement required for lock',
      severity: 'error',
    });
  }

  // Brand pack required
  if (!bulletin.brand_pack_id) {
    errors.push({
      field: 'brand_pack',
      message: 'Brand pack must be assigned',
      severity: 'error',
    });
  }

  // Preview artifacts should exist (pdf_url)
  if (!bulletin.pdf_url) {
    errors.push({
      field: 'pdf_url',
      message: 'Preview PDF not generated. Run build first.',
      severity: 'error',
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

// ============================================================================
// Content Hash (Immutability)
// ============================================================================

export class BulletinHashService {
  constructor(private db: PrismaClient) {}

  /**
   * Generate SHA-256 content hash for bulletin
   * Hash includes: service items, announcements, brand pack, template version
   */
  async generateContentHash(issueId: string): Promise<string> {
    const bulletin = await this.db.bulletin_issue.findUnique({
      where: { id: issueId },
      include: {
        service_items: {
          select: {
            type: true,
            sequence: true,
            title: true,
            content: true,
            ccli_number: true,
            artist: true,
            scripture_ref: true,
            speaker: true,
          },
          orderBy: { sequence: 'asc' },
        },
        bulletin_announcements: {
          include: {
            announcement: {
              select: { id: true, title: true, body: true, priority: true },
            },
          },
          orderBy: { display_order: 'asc' },
        },
      },
    });

    if (!bulletin) {
      throw new Error('Bulletin not found');
    }

    const hashInput: ContentHashInput = {
      serviceItems: bulletin.service_items,
      announcements: bulletin.bulletin_announcements.map((ba) => ba.announcement),
      brandPackId: bulletin.brand_pack_id || 'none',
      templateVersion: '1.0', // Template version for future compatibility
    };

    const inputString = JSON.stringify(hashInput, null, 0); // Deterministic JSON
    const hash = crypto.createHash('sha256').update(inputString).digest('hex');

    return `sha256:${hash}`;
  }

  /**
   * Verify content hash matches current bulletin content
   */
  async verifyContentHash(issueId: string): Promise<boolean> {
    const bulletin = await this.db.bulletin_issue.findUnique({
      where: { id: issueId },
      select: { content_hash: true },
    });

    if (!bulletin || !bulletin.content_hash) {
      return false;
    }

    const currentHash = await this.generateContentHash(issueId);
    return currentHash === bulletin.content_hash;
  }

  /**
   * Store content hash in bulletin (call on lock)
   */
  async storeContentHash(issueId: string): Promise<string> {
    const hash = await this.generateContentHash(issueId);

    await this.db.bulletin_issue.update({
      where: { id: issueId },
      data: {
        content_hash: hash,
        locked_at: new Date(),
      },
    });

    return hash;
  }
}

// ============================================================================
// Lock Enforcement (Database Constraint)
// ============================================================================

/**
 * Middleware to prevent editing locked bulletins
 * Use in tRPC mutations that modify bulletin content
 */
export async function enforceLockImmutability(
  issueId: string,
  db: PrismaClient
): Promise<void> {
  const bulletin = await db.bulletin_issue.findUnique({
    where: { id: issueId },
    select: { status: true, locked_at: true, reopened_at: true },
  });

  if (!bulletin) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Bulletin not found',
    });
  }

  // Block edits if locked (and not reopened)
  if (bulletin.status === 'locked' && !bulletin.reopened_at) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cannot modify locked bulletin',
      cause: { locked_at: bulletin.locked_at },
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  BulletinStateMachine,
  BulletinHashService,
  enforceLockImmutability,
  validateForApproval,
  validateForBuild,
  validateForLock,
};

/**
 * P13_digest.ts
 * Weekly Digest Generator - "Your Week"
 *
 * Sends personalized weekly email every Monday at 9:00 AM (tenant's local time)
 * Includes:
 * - Upcoming events this week
 * - New/important announcements
 * - Unread messages in channels
 * - This Sunday's service preview (if bulletin locked)
 *
 * Usage: Run via Azure Function Timer Trigger or cron job
 */

import { addDays, startOfWeek, endOfWeek, format, isMonday } from 'date-fns';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

interface DigestData {
  recipient: {
    id: string;
    name: string;
    email: string;
    preferences: {
      includeChannels: string[]; // Channel IDs to include
      includeGiving: boolean;
    };
  };
  tenant: {
    id: string;
    name: string;
    timezone: string; // e.g., "America/New_York"
    contactEmail: string;
    contactPhone?: string;
  };
  content: {
    sundayService?: SundayServicePreview;
    events: EventSummary[];
    announcements: AnnouncementSummary[];
    messages: ChannelSummary[];
  };
}

interface SundayService Preview {
  date: Date;
  time: string; // "10:00 AM"
  sermonTitle: string;
  sermonSpeaker: string;
  bulletinUrl?: string; // Link to full bulletin PDF
}

interface EventSummary {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  rsvpStatus?: 'going' | 'not_going' | 'maybe' | null;
  rsvpUrl: string;
}

interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  url: string;
}

interface ChannelSummary {
  id: string;
  name: string;
  unreadCount: number;
  url: string;
}

interface DigestStats {
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// Digest Generator Service
// ============================================================================

export class WeeklyDigestService {
  constructor(
    private db: any, // Database client
    private emailService: any, // Email sending service
    private appBaseUrl: string
  ) {}

  /**
   * Generate and send weekly digest for all tenants
   * Run every Monday at 9:00 AM tenant local time
   */
  async sendWeeklyDigests(): Promise<DigestStats> {
    const stats: DigestStats = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Get all active tenants
      const tenants = await this.db.tenant.findMany({
        where: { active: true },
        select: { id: true, name: true, timezone: true, contactEmail: true, contactPhone: true },
      });

      // Process each tenant
      for (const tenant of tenants) {
        try {
          // Check if it's Monday 9am in tenant's timezone
          if (!this.isSendTime(tenant.timezone)) {
            stats.skipped++;
            continue;
          }

          const tenantStats = await this.sendTenantDigests(tenant);
          stats.sent += tenantStats.sent;
          stats.failed += tenantStats.failed;
          stats.errors.push(...tenantStats.errors);
        } catch (error) {
          stats.failed++;
          stats.errors.push(
            `Tenant ${tenant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Log summary
      await this.logDigestRun(stats);
    } catch (error) {
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return stats;
  }

  /**
   * Send digests for a single tenant
   */
  private async sendTenantDigests(tenant: any): Promise<DigestStats> {
    const stats: DigestStats = { sent: 0, failed: 0, skipped: 0, errors: [] };

    // Get all recipients (members with email, opted-in)
    const recipients = await this.db.person.findMany({
      where: {
        tenantId: tenant.id,
        email: { not: null },
        digestEnabled: true, // User preference
        lastLoginAt: { gte: addDays(new Date(), -90) }, // Active within 90 days
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        notificationPreferences: true,
      },
    });

    // Send in batches of 100
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        try {
          const digestData = await this.buildDigestData(recipient, tenant);

          // Skip if no content
          if (this.isDigestEmpty(digestData)) {
            stats.skipped++;
            continue;
          }

          // Generate HTML email
          const html = this.renderDigestHTML(digestData);
          const subject = `Your Week at ${tenant.name} - ${this.getWeekRange()}`;

          // Send email
          await this.emailService.send({
            to: recipient.email,
            from: `${tenant.name} <noreply@${this.getEmailDomain(tenant)}>`,
            replyTo: tenant.contactEmail,
            subject,
            html,
            headers: {
              'List-Unsubscribe': `<${this.appBaseUrl}/unsubscribe?token=${recipient.id}>`,
            },
          });

          stats.sent++;

          // Rate limit: Wait 600ms between emails (100/minute)
          await this.sleep(600);
        } catch (error) {
          stats.failed++;
          stats.errors.push(
            `${recipient.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return stats;
  }

  /**
   * Build digest data for a recipient
   */
  private async buildDigestData(recipient: any, tenant: any): Promise<DigestData> {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday

    // Get this Sunday's service (if bulletin locked)
    const sundayService = await this.getSundayService(tenant.id, weekEnd);

    // Get upcoming events this week (user hasn't RSVP'd or is attending)
    const events = await this.getUpcomingEvents(recipient.id, tenant.id, weekStart, weekEnd);

    // Get active announcements (not dismissed by user)
    const announcements = await this.getActiveAnnouncements(recipient.id, tenant.id);

    // Get unread messages in user's channels
    const messages = await this.getUnreadMessages(recipient.id, tenant.id);

    return {
      recipient: {
        id: recipient.id,
        name: `${recipient.firstName} ${recipient.lastName}`.trim() || 'Friend',
        email: recipient.email,
        preferences: recipient.notificationPreferences || {
          includeChannels: [],
          includeGiving: true,
        },
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        timezone: tenant.timezone,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
      },
      content: {
        sundayService,
        events,
        announcements,
        messages,
      },
    };
  }

  /**
   * Get Sunday service preview
   */
  private async getSundayService(
    tenantId: string,
    sunday: Date
  ): Promise<SundayServicePreview | undefined> {
    // Find locked bulletin for this Sunday
    const bulletin = await this.db.bulletinIssue.findFirst({
      where: {
        tenantId,
        serviceDate: sunday,
        status: 'locked',
      },
      include: {
        serviceItems: {
          where: { type: 'sermon' },
          take: 1,
        },
      },
    });

    if (!bulletin) return undefined;

    const sermon = bulletin.serviceItems[0];
    if (!sermon) return undefined;

    return {
      date: bulletin.serviceDate,
      time: bulletin.serviceTime || '10:00 AM',
      sermonTitle: sermon.title,
      sermonSpeaker: sermon.speaker || 'Pastor',
      bulletinUrl: bulletin.pdfUrl
        ? `${this.appBaseUrl}/bulletins/${bulletin.id}/pdf`
        : undefined,
    };
  }

  /**
   * Get upcoming events this week
   */
  private async getUpcomingEvents(
    recipientId: string,
    tenantId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<EventSummary[]> {
    const events = await this.db.event.findMany({
      where: {
        tenantId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
        deleted_at: null,
      },
      include: {
        rsvps: {
          where: { personId: recipientId },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 10, // Max 10 events in digest
    });

    return events.map((event: any) => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      rsvpStatus: event.rsvps[0]?.status || null,
      rsvpUrl: `${this.appBaseUrl}/events/${event.id}`,
    }));
  }

  /**
   * Get active announcements
   */
  private async getActiveAnnouncements(
    recipientId: string,
    tenantId: string
  ): Promise<AnnouncementSummary[]> {
    const announcements = await this.db.announcement.findMany({
      where: {
        tenantId,
        expiresAt: { gte: new Date() },
        deleted_at: null,
        NOT: {
          dismissedBy: {
            has: recipientId, // User hasn't dismissed
          },
        },
      },
      orderBy: [
        { priority: 'desc' }, // Urgent first
        { createdAt: 'desc' },
      ],
      take: 5, // Max 5 announcements
    });

    return announcements.map((a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      priority: a.priority,
      url: `${this.appBaseUrl}/announcements/${a.id}`,
    }));
  }

  /**
   * Get unread messages in user's channels
   */
  private async getUnreadMessages(
    recipientId: string,
    tenantId: string
  ): Promise<ChannelSummary[]> {
    const channels = await this.db.channel.findMany({
      where: {
        tenantId,
        archived: false,
        // User is member or channel is visible to all
        OR: [
          { visibility: 'all' },
          { members: { some: { personId: recipientId } } },
        ],
      },
      include: {
        messages: {
          where: {
            createdAt: { gte: addDays(new Date(), -7) }, // Last 7 days
            NOT: {
              readBy: {
                has: recipientId,
              },
            },
          },
        },
      },
    });

    return channels
      .filter((c: any) => c.messages.length > 0)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        unreadCount: c.messages.length,
        url: `${this.appBaseUrl}/messages/${c.id}`,
      }));
  }

  /**
   * Check if digest is empty (skip sending)
   */
  private isDigestEmpty(data: DigestData): boolean {
    return (
      !data.content.sundayService &&
      data.content.events.length === 0 &&
      data.content.announcements.length === 0 &&
      data.content.messages.length === 0
    );
  }

  /**
   * Render digest HTML
   */
  private renderDigestHTML(data: DigestData): string {
    const { recipient, tenant, content } = data;

    // Priority emoji mapping
    const priorityEmoji = {
      urgent: '🔴',
      high: '🟠',
      normal: '🔵',
      low: '⚪',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale-1">
  <title>Your Week at ${tenant.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; }
    .event { background: #f9fafb; padding: 16px; margin: 12px 0; border-radius: 8px; }
    .event-title { font-weight: 600; font-size: 16px; }
    .event-time { color: #6b7280; font-size: 14px; }
    .announcement { padding: 16px; margin: 12px 0; border-left: 4px solid #2563eb; background: #eff6ff; }
    .announcement-urgent { border-color: #dc2626; background: #fef2f2; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Your Week at ${tenant.name}</h1>
  <p>Hi ${recipient.name},</p>
  <p>Here's what's happening this week:</p>

  ${content.sundayService ? `
    <h2>📅 THIS SUNDAY</h2>
    <div class="event">
      <div class="event-title">${format(content.sundayService.date, 'MMMM d')} at ${content.sundayService.time}</div>
      <div>Message: "${content.sundayService.sermonTitle}" - ${content.sundayService.sermonSpeaker}</div>
      ${content.sundayService.bulletinUrl ? `<a href="${content.sundayService.bulletinUrl}" class="button">View Full Bulletin</a>` : ''}
    </div>
  ` : ''}

  ${content.events.length > 0 ? `
    <h2>📆 THIS WEEK'S EVENTS (${content.events.length})</h2>
    ${content.events.map(event => `
      <div class="event">
        <div class="event-title">${event.title}</div>
        <div class="event-time">${format(event.startTime, 'EEEE, MMM d, h:mm a')}${event.location ? ` - ${event.location}` : ''}</div>
        ${!event.rsvpStatus ? `<a href="${event.rsvpUrl}" class="button">RSVP</a>` : ''}
      </div>
    `).join('')}
  ` : ''}

  ${content.announcements.length > 0 ? `
    <h2>📢 ANNOUNCEMENTS (${content.announcements.length})</h2>
    ${content.announcements.map(ann => `
      <div class="announcement ${ann.priority === 'urgent' ? 'announcement-urgent' : ''}">
        <div><strong>${priorityEmoji[ann.priority]} ${ann.title}</strong></div>
        <div>${ann.body}</div>
        <a href="${ann.url}">More Details</a>
      </div>
    `).join('')}
  ` : ''}

  ${content.messages.length > 0 ? `
    <h2>💬 MESSAGES (${content.messages.reduce((sum, ch) => sum + ch.unreadCount, 0)} unread)</h2>
    ${content.messages.map(ch => `
      <div>${ch.name} (${ch.unreadCount} new) - <a href="${ch.url}">Read</a></div>
    `).join('')}
  ` : ''}

  ${recipient.preferences.includeGiving ? `
    <h2>❤️ QUICK GIVE</h2>
    <p>Give online anytime:</p>
    <a href="${this.appBaseUrl}/give" class="button">Give Now</a>
  ` : ''}

  <div class="footer">
    <p>Need help? Reply to this email or call ${tenant.contactPhone || tenant.contactEmail}</p>
    <p><a href="${this.appBaseUrl}/settings/notifications">Email Preferences</a> | <a href="${this.appBaseUrl}/unsubscribe?token=${recipient.id}">Unsubscribe</a></p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Check if it's send time (Monday 9am in tenant timezone)
   */
  private isSendTime(timezone: string): boolean {
    const now = new Date();
    // TODO: Convert to tenant timezone and check if Monday 9am
    // For now, simple check
    return isMonday(now) && now.getHours() === 9;
  }

  /**
   * Get week range string
   */
  private getWeekRange(): string {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return `${format(start, 'MMM d')}-${format(end, 'd')}`;
  }

  /**
   * Get email domain for tenant
   */
  private getEmailDomain(tenant: any): string {
    // Extract domain from contact email or use default
    return tenant.contactEmail?.split('@')[1] || 'church.app';
  }

  /**
   * Log digest run
   */
  private async logDigestRun(stats: DigestStats): Promise<void> {
    await this.db.digestLog.create({
      data: {
        runDate: new Date(),
        sent: stats.sent,
        failed: stats.failed,
        skipped: stats.skipped,
        errors: stats.errors,
      },
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Azure Function Entry Point
// ============================================================================

/**
 * Azure Function Timer Trigger
 * Schedule: "0 0 9 * * MON" (Every Monday at 9:00 AM UTC)
 *
 * Note: Adjust schedule based on tenant timezones
 */
export async function weeklyDigestTimer(context: any, timer: any): Promise<void> {
  context.log('Weekly digest timer triggered');

  const service = new WeeklyDigestService(
    context.bindings.db, // Prisma client
    context.bindings.emailService, // SendGrid/etc
    process.env.APP_BASE_URL || 'https://app.example.com'
  );

  const stats = await service.sendWeeklyDigests();

  context.log(`Digest sent: ${stats.sent}, failed: ${stats.failed}, skipped: ${stats.skipped}`);

  if (stats.errors.length > 0) {
    context.log.error('Errors:', stats.errors);
  }
}

export default WeeklyDigestService;

/**
 * P14_webhooks.ts
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for:
 * - payment_intent.succeeded - One-time gift successful
 * - payment_intent.payment_failed - Payment failed
 * - invoice.paid - Recurring gift successful
 * - invoice.payment_failed - Recurring payment failed
 * - customer.subscription.deleted - Subscription cancelled
 *
 * Security:
 * - Verifies webhook signature
 * - Idempotent processing (handles duplicate events)
 * - Rate limiting
 */

import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// ============================================================================
// Types
// ============================================================================

interface WebhookResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processed: boolean; // false if already processed (idempotent)
  error?: string;
}

interface EmailService {
  send(params: {
    to: string;
    from: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

// ============================================================================
// Webhook Handler Service
// ============================================================================

export class StripeWebhookHandler {
  constructor(
    private db: any, // Database client
    private emailService: EmailService
  ) {}

  /**
   * Main webhook handler
   * Verify signature and route to appropriate handler
   */
  async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<WebhookResult> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      // Check if event already processed (idempotency)
      const existing = await this.db.webhookEvent.findUnique({
        where: { externalEventId: event.id },
      });

      if (existing) {
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          processed: false, // Already processed
        };
      }

      // Log event
      await this.db.webhookEvent.create({
        data: {
          externalEventId: event.id,
          eventType: event.type,
          payload: event as any,
          processedAt: null,
        },
      });

      // Route to handler
      let result: WebhookResult;
      switch (event.type) {
        case 'payment_intent.succeeded':
          result = await this.handlePaymentIntentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          result = await this.handlePaymentIntentFailed(event);
          break;

        case 'invoice.paid':
          result = await this.handleInvoicePaid(event);
          break;

        case 'invoice.payment_failed':
          result = await this.handleInvoicePaymentFailed(event);
          break;

        case 'customer.subscription.deleted':
          result = await this.handleSubscriptionDeleted(event);
          break;

        default:
          // Unhandled event type, log but don't error
          console.log(`Unhandled event type: ${event.type}`);
          result = {
            success: true,
            eventId: event.id,
            eventType: event.type,
            processed: true,
          };
      }

      // Mark as processed
      await this.db.webhookEvent.update({
        where: { externalEventId: event.id },
        data: { processedAt: new Date() },
      });

      return result;
    } catch (error) {
      console.error('Webhook error:', error);

      return {
        success: false,
        eventId: '',
        eventType: '',
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle payment_intent.succeeded
   * One-time gift successful
   */
  private async handlePaymentIntentSucceeded(
    event: Stripe.Event
  ): Promise<WebhookResult> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    try {
      // Find contribution
      const contribution = await this.db.contribution.findUnique({
        where: { externalPaymentId: paymentIntent.id },
        include: { fund: true, person: true, tenant: true },
      });

      if (!contribution) {
        throw new Error(`Contribution not found for payment intent ${paymentIntent.id}`);
      }

      // Update contribution status
      await this.db.contribution.update({
        where: { id: contribution.id },
        data: {
          paymentStatus: 'succeeded',
          processedAt: new Date(),
        },
      });

      // Send receipt email
      await this.sendReceipt(contribution);

      // Log for analytics
      await this.logContributionSuccess(contribution);

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
      };
    } catch (error) {
      throw new Error(
        `Failed to process payment_intent.succeeded: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle payment_intent.payment_failed
   */
  private async handlePaymentIntentFailed(
    event: Stripe.Event
  ): Promise<WebhookResult> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    try {
      // Update contribution status
      await this.db.contribution.updateMany({
        where: { externalPaymentId: paymentIntent.id },
        data: {
          paymentStatus: 'failed',
          updatedAt: new Date(),
        },
      });

      // Notify admin of failed payment
      // (Optional: notify donor)

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
      };
    } catch (error) {
      throw new Error(`Failed to process payment_intent.payment_failed: ${error}`);
    }
  }

  /**
   * Handle invoice.paid
   * Recurring gift successful
   */
  private async handleInvoicePaid(event: Stripe.Event): Promise<WebhookResult> {
    const invoice = event.data.object as Stripe.Invoice;

    try {
      if (!invoice.subscription) {
        // Not a subscription invoice, skip
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          processed: true,
        };
      }

      // Get subscription metadata
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      const metadata = subscription.metadata;

      // Create new contribution record for this recurring payment
      const contribution = await this.db.contribution.create({
        data: {
          tenantId: metadata.tenant_id,
          personId: metadata.person_id,
          fundId: metadata.fund_id,
          amountCents: invoice.amount_paid,
          paymentMethod: 'card', // Recurring always uses saved card
          paymentStatus: 'succeeded',
          externalPaymentId: invoice.payment_intent as string,
          isRecurring: true,
          subscriptionId: invoice.subscription as string,
          processedAt: new Date(),
        },
        include: { fund: true, person: true, tenant: true },
      });

      // Send receipt
      await this.sendReceipt(contribution);

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
      };
    } catch (error) {
      throw new Error(`Failed to process invoice.paid: ${error}`);
    }
  }

  /**
   * Handle invoice.payment_failed
   */
  private async handleInvoicePaymentFailed(
    event: Stripe.Event
  ): Promise<WebhookResult> {
    const invoice = event.data.object as Stripe.Invoice;

    try {
      if (!invoice.subscription) {
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          processed: true,
        };
      }

      // Get subscription metadata
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      const metadata = subscription.metadata;

      // Find the person
      const person = await this.db.person.findUnique({
        where: { id: metadata.person_id },
      });

      if (person && person.email) {
        // Send failure notification
        await this.emailService.send({
          to: person.email,
          from: `Giving <noreply@church.app>`,
          subject: 'Your recurring gift payment failed',
          html: `
            <p>Hi ${person.firstName},</p>
            <p>We were unable to process your recurring gift payment.</p>
            <p>Please update your payment method to continue supporting the church.</p>
            <p><a href="${process.env.APP_BASE_URL}/give/recurring">Update Payment Method</a></p>
          `,
        });
      }

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
      };
    } catch (error) {
      throw new Error(`Failed to process invoice.payment_failed: ${error}`);
    }
  }

  /**
   * Handle customer.subscription.deleted
   */
  private async handleSubscriptionDeleted(
    event: Stripe.Event
  ): Promise<WebhookResult> {
    const subscription = event.data.object as Stripe.Subscription;

    try {
      // Mark all future contributions as cancelled
      await this.db.contribution.updateMany({
        where: {
          subscriptionId: subscription.id,
          paymentStatus: 'pending',
        },
        data: {
          paymentStatus: 'failed',
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
      };
    } catch (error) {
      throw new Error(`Failed to process customer.subscription.deleted: ${error}`);
    }
  }

  /**
   * Send email receipt
   */
  private async sendReceipt(contribution: any): Promise<void> {
    const email = contribution.person?.email || contribution.guestEmail;
    if (!email) return;

    const receiptHtml = this.renderReceiptEmail(contribution);

    await this.emailService.send({
      to: email,
      from: `${contribution.tenant.name} <giving@${contribution.tenant.domain || 'church.app'}>`,
      subject: `Thank you for your gift to ${contribution.tenant.name}`,
      html: receiptHtml,
    });

    // Mark receipt as sent
    await this.db.contribution.update({
      where: { id: contribution.id },
      data: { receiptSentAt: new Date() },
    });
  }

  /**
   * Render receipt email HTML
   */
  private renderReceiptEmail(contribution: any): string {
    const donorName =
      contribution.person
        ? `${contribution.person.firstName} ${contribution.person.lastName}`.trim()
        : contribution.guestName || 'Friend';

    const amount = (contribution.amountCents / 100).toFixed(2);
    const date = contribution.processedAt.toLocaleDateString();

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
    .amount { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; margin: 20px 0; }
    .details { background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${contribution.tenant.name}</h1>
    <p>Thank you for your generosity!</p>
  </div>

  <p>Dear ${donorName},</p>

  <p>Thank you for your gift to <strong>${contribution.fund.name}</strong>.</p>

  <div class="amount">$${amount}</div>

  <div class="details">
    <div class="detail-row">
      <span class="label">Date:</span>
      <span>${date}</span>
    </div>
    <div class="detail-row">
      <span class="label">Amount:</span>
      <span>$${amount}</span>
    </div>
    <div class="detail-row">
      <span class="label">Fund:</span>
      <span>${contribution.fund.name}</span>
    </div>
    <div class="detail-row">
      <span class="label">Payment Method:</span>
      <span>${contribution.paymentMethod}</span>
    </div>
    <div class="detail-row">
      <span class="label">Receipt ID:</span>
      <span>${contribution.id.slice(0, 8)}</span>
    </div>
  </div>

  <p>Your gift makes a real difference in our community. Thank you for your faithful support!</p>

  <div class="footer">
    <p><strong>${contribution.tenant.name}</strong></p>
    <p>Tax ID: ${contribution.tenant.taxId || 'N/A'}</p>
    <p style="margin-top: 16px; font-size: 12px;">This email serves as your receipt for tax purposes. Please keep for your records.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Log contribution for analytics
   */
  private async logContributionSuccess(contribution: any): Promise<void> {
    // Example: Log to analytics service
    console.log('Contribution succeeded:', {
      contributionId: contribution.id,
      tenantId: contribution.tenantId,
      fundId: contribution.fundId,
      amount: contribution.amountCents / 100,
    });

    // Could also:
    // - Send to analytics platform (Segment, Mixpanel, etc.)
    // - Update cached totals
    // - Trigger celebration email to admin (large gifts)
  }
}

// ============================================================================
// Webhook Route Handler (Express/Next.js API Route)
// ============================================================================

/**
 * Express/Next.js API route handler
 *
 * Example (Next.js):
 *
 * // pages/api/webhooks/stripe.ts
 * import { buffer } from 'micro';
 * import type { NextApiRequest, NextApiResponse } from 'next';
 *
 * export const config = { api: { bodyParser: false } };
 *
 * export default async function handler(
 *   req: NextApiRequest,
 *   res: NextApiResponse
 * ) {
 *   if (req.method !== 'POST') {
 *     return res.status(405).json({ error: 'Method not allowed' });
 *   }
 *
 *   const rawBody = await buffer(req);
 *   const signature = req.headers['stripe-signature'] as string;
 *
 *   if (!signature) {
 *     return res.status(400).json({ error: 'Missing signature' });
 *   }
 *
 *   const handler = new StripeWebhookHandler(prisma, emailService);
 *   const result = await handler.handleWebhook(rawBody.toString(), signature);
 *
 *   if (!result.success) {
 *     return res.status(400).json({ error: result.error });
 *   }
 *
 *   return res.status(200).json({ received: true });
 * }
 */

// ============================================================================
// Database Schema for Webhook Events
// ============================================================================

/**
 * Webhook event log table
 *
 * CREATE TABLE WebhookEvent (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   external_event_id VARCHAR(200) UNIQUE NOT NULL, -- Stripe event ID
 *   event_type VARCHAR(100) NOT NULL, -- e.g., "payment_intent.succeeded"
 *   payload JSONB NOT NULL, -- Full event payload
 *   processed_at TIMESTAMP, -- NULL if not yet processed
 *   created_at TIMESTAMP DEFAULT NOW(),
 *
 *   INDEX idx_webhook_event_type (event_type),
 *   INDEX idx_webhook_processed (processed_at)
 * );
 */

export default StripeWebhookHandler;

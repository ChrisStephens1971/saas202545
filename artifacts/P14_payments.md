# P14: Giving & Payments Specification (V1)

**Version:** 1.0
**Date:** 2025-11-14
**Status:** Planning

---

## Overview

Simple giving system for church members to make one-time or recurring donations.

**V1 Scope:**
- One-time gifts (card, ACH, Apple Pay, Google Pay)
- Recurring gifts (monthly schedule)
- Fund designation (General, Missions, Building, etc.)
- Email receipts
- Annual giving statements (PDF + CSV for QuickBooks)
- **NOT in V1:** Full general ledger, pledge tracking, multi-currency

**Payment Processor:** Stripe (recommended for churches)
**Alternative:** PayPal Giving Fund

---

## 1. Funds

### Fund Schema

```sql
CREATE TABLE Fund (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES Tenant(id),
  name VARCHAR(60) NOT NULL, -- "General Fund", "Missions", "Building"
  description VARCHAR(300),
  is_default BOOLEAN DEFAULT false, -- Default selection on give form
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

-- Ensure only one default per tenant
CREATE UNIQUE INDEX idx_fund_default
  ON Fund(tenant_id)
  WHERE is_default = true;
```

**Example Funds:**
- General Fund (default)
- Missions
- Building Fund
- Benevolence
- Youth Ministry

---

## 2. Contributions

### Contribution Schema

```sql
CREATE TABLE Contribution (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES Tenant(id),
  person_id UUID REFERENCES Person(id), -- NULL for guest giving
  fund_id UUID NOT NULL REFERENCES Fund(id),

  -- Amounts
  amount_cents INT NOT NULL CHECK (amount_cents > 0), -- Store as cents
  currency VARCHAR(3) DEFAULT 'USD',
  fee_cents INT DEFAULT 0, -- Processor fee (if covered by donor)

  -- Payment info
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('card', 'ach', 'apple_pay', 'google_pay', 'check', 'cash')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  external_payment_id VARCHAR(200), -- Stripe payment intent ID

  -- Recurring
  is_recurring BOOLEAN DEFAULT false,
  recurring_schedule VARCHAR(20) CHECK (recurring_schedule IN ('weekly', 'monthly', 'yearly')),
  subscription_id VARCHAR(200), -- Stripe subscription ID

  -- Guest info (if person_id is NULL)
  guest_name VARCHAR(100),
  guest_email VARCHAR(200),

  -- Metadata
  note TEXT, -- Optional donor note
  receipt_sent_at TIMESTAMP,
  processed_at TIMESTAMP,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure guest donations have contact info
  CONSTRAINT guest_has_email CHECK (
    (person_id IS NOT NULL) OR
    (person_id IS NULL AND guest_email IS NOT NULL)
  )
);

CREATE INDEX idx_contribution_person ON Contribution(person_id, created_at DESC);
CREATE INDEX idx_contribution_tenant ON Contribution(tenant_id, created_at DESC);
CREATE INDEX idx_contribution_fund ON Contribution(fund_id);
CREATE INDEX idx_contribution_external ON Contribution(external_payment_id);
```

---

## 3. Payment Flows

### 3.1 One-Time Gift

```
User                      Frontend                 Backend                  Stripe
  |                           |                        |                       |
  | 1. Select fund + amount   |                        |                       |
  |-------------------------->|                        |                       |
  |                           |                        |                       |
  | 2. Enter payment method   |                        |                       |
  |-------------------------->|                        |                       |
  |                           | 3. Create payment intent                       |
  |                           |----------------------->|                       |
  |                           |                        | 4. POST /payment-intents
  |                           |                        |---------------------->|
  |                           |                        | 5. Return client_secret
  |                           |                        |<----------------------|
  |                           | 6. Return client_secret|                       |
  |                           |<-----------------------|                       |
  | 7. Stripe.js confirm      |                        |                       |
  |-------------------------------------------------------------->|             |
  |                           |                        | 8. Webhook: payment_intent.succeeded
  |                           |                        |<----------------------|
  |                           |                        | 9. Update contribution|
  |                           |                        | 10. Send receipt email|
  | 11. Show success + receipt                         |                       |
  |<--------------------------|                        |                       |
```

**Steps:**
1. User selects fund, enters amount
2. User enters payment method (card, ACH, Apple Pay, Google Pay)
3. Backend creates Stripe PaymentIntent
4. Frontend uses Stripe.js to confirm payment
5. Stripe webhook notifies backend of success
6. Backend marks contribution as succeeded, sends receipt

### 3.2 Recurring Gift

```
User                      Frontend                 Backend                  Stripe
  |                           |                        |                       |
  | 1. Select fund + amount   |                        |                       |
  | 2. Choose "Monthly"       |                        |                       |
  |-------------------------->|                        |                       |
  |                           | 3. Create subscription |                       |
  |                           |----------------------->|                       |
  |                           |                        | 4. POST /subscriptions
  |                           |                        |---------------------->|
  |                           |                        | 5. Return subscription
  |                           |                        |<----------------------|
  |                           | 6. Return sub ID       |                       |
  |                           |<-----------------------|                       |
  |                           |                        | 7. Webhook: invoice.paid (monthly)
  |                           |                        |<----------------------|
  |                           |                        | 8. Create contribution|
  |                           |                        | 9. Send receipt       |
```

**Steps:**
1. User selects recurring schedule (weekly, monthly, yearly)
2. Backend creates Stripe Subscription
3. Stripe automatically charges each period
4. Webhook creates new Contribution record each time
5. Receipt emailed each time

---

## 4. API Endpoints (tRPC)

### giving router

```typescript
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export const givingRouter = router({
  /**
   * List available funds
   */
  listFunds: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.fund.findMany({
      where: {
        tenantId: ctx.session.tenantId,
        isActive: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }),

  /**
   * Create one-time payment intent
   */
  createPaymentIntent: publicProcedure // Allow guest giving
    .input(
      z.object({
        fundId: z.string().uuid(),
        amountCents: z.number().int().min(100).max(1000000), // $1 to $10,000
        paymentMethod: z.enum(['card', 'ach']),
        coverFee: z.boolean().default(false), // Cover processing fee?
        note: z.string().max(500).optional(),
        // Guest info (if not logged in)
        guestName: z.string().max(100).optional(),
        guestEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate fund exists
      const fund = await ctx.db.fund.findUnique({
        where: { id: input.fundId },
      });
      if (!fund) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fund not found' });

      // Calculate total (include fee if donor covering)
      let totalCents = input.amountCents;
      let feeCents = 0;
      if (input.coverFee) {
        // Stripe fees: 2.9% + 30¢ for cards, 0.8% + $5 for ACH
        if (input.paymentMethod === 'card') {
          feeCents = Math.round(input.amountCents * 0.029 + 30);
        } else {
          feeCents = Math.round(input.amountCents * 0.008 + 500); // ACH
        }
        totalCents = input.amountCents + feeCents;
      }

      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        payment_method_types: input.paymentMethod === 'ach' ? ['us_bank_account'] : ['card'],
        metadata: {
          tenant_id: fund.tenantId,
          fund_id: input.fundId,
          person_id: ctx.session?.userId || '',
          guest_name: input.guestName || '',
          guest_email: input.guestEmail || '',
        },
      });

      // Create contribution record (pending)
      const contribution = await ctx.db.contribution.create({
        data: {
          tenantId: fund.tenantId,
          personId: ctx.session?.userId || null,
          fundId: input.fundId,
          amountCents: input.amountCents,
          feeCents,
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          externalPaymentId: paymentIntent.id,
          isRecurring: false,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          note: input.note,
        },
      });

      return {
        contributionId: contribution.id,
        clientSecret: paymentIntent.client_secret,
      };
    }),

  /**
   * Create recurring subscription
   */
  createSubscription: protectedProcedure
    .input(
      z.object({
        fundId: z.string().uuid(),
        amountCents: z.number().int().min(100),
        schedule: z.enum(['weekly', 'monthly', 'yearly']),
        paymentMethodId: z.string(), // Stripe payment method ID
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get or create Stripe customer
      let customerId = ctx.session.user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email,
          name: ctx.session.user.name,
          metadata: { tenant_id: ctx.session.tenantId, person_id: ctx.session.userId },
        });
        customerId = customer.id;

        // Save to database
        await ctx.db.person.update({
          where: { id: ctx.session.userId },
          data: { stripeCustomerId: customerId },
        });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(input.paymentMethodId, { customer: customerId });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Recurring Gift`,
              },
              recurring: {
                interval: input.schedule === 'yearly' ? 'year' : input.schedule === 'weekly' ? 'week' : 'month',
              },
              unit_amount: input.amountCents,
            },
          },
        ],
        default_payment_method: input.paymentMethodId,
        metadata: {
          tenant_id: ctx.session.tenantId,
          fund_id: input.fundId,
          person_id: ctx.session.userId,
        },
      });

      // Create initial contribution record
      const contribution = await ctx.db.contribution.create({
        data: {
          tenantId: ctx.session.tenantId,
          personId: ctx.session.userId,
          fundId: input.fundId,
          amountCents: input.amountCents,
          paymentMethod: 'card',
          paymentStatus: 'pending',
          isRecurring: true,
          recurringSchedule: input.schedule,
          subscriptionId: subscription.id,
        },
      });

      return { subscriptionId: subscription.id, contributionId: contribution.id };
    }),

  /**
   * Cancel recurring subscription
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns this subscription
      const contribution = await ctx.db.contribution.findFirst({
        where: {
          subscriptionId: input.subscriptionId,
          personId: ctx.session.userId,
        },
      });
      if (!contribution) throw new TRPCError({ code: 'NOT_FOUND' });

      // Cancel in Stripe
      await stripe.subscriptions.cancel(input.subscriptionId);

      // Update all future contributions
      await ctx.db.contribution.updateMany({
        where: { subscriptionId: input.subscriptionId, paymentStatus: 'pending' },
        data: { paymentStatus: 'failed' },
      });

      return { success: true };
    }),

  /**
   * Get giving history for current user
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        year: z.number().int().optional(), // Filter by year
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        personId: ctx.session.userId,
        paymentStatus: 'succeeded',
      };

      if (input.year) {
        where.processedAt = {
          gte: new Date(input.year, 0, 1),
          lt: new Date(input.year + 1, 0, 1),
        };
      }

      return ctx.db.contribution.findMany({
        where,
        include: { fund: true },
        orderBy: { processedAt: 'desc' },
        take: input.limit,
      });
    }),

  /**
   * Export giving statement (CSV for QuickBooks)
   */
  exportStatement: protectedProcedure
    .input(z.object({ year: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const contributions = await ctx.db.contribution.findMany({
        where: {
          personId: ctx.session.userId,
          paymentStatus: 'succeeded',
          processedAt: {
            gte: new Date(input.year, 0, 1),
            lt: new Date(input.year + 1, 0, 1),
          },
        },
        include: { fund: true },
        orderBy: { processedAt: 'asc' },
      });

      // Generate CSV
      const rows = contributions.map((c) => ({
        Date: format(c.processedAt!, 'MM/dd/yyyy'),
        Amount: (c.amountCents / 100).toFixed(2),
        Fund: c.fund.name,
        'Payment Method': c.paymentMethod,
        'Receipt ID': c.id.slice(0, 8),
      }));

      const csv = generateCSV(rows);
      return { csv, filename: `giving-statement-${input.year}.csv` };
    }),
});
```

---

## 5. Webhook Handling

See `P14_webhooks.ts` for complete implementation.

**Critical Webhooks:**
- `payment_intent.succeeded` - One-time gift successful
- `payment_intent.payment_failed` - Payment failed
- `invoice.paid` - Recurring gift successful
- `customer.subscription.deleted` - Subscription cancelled

---

## 6. Email Receipts

### Receipt Template

```
Subject: Thank you for your gift to [Church Name]

Hi [Donor Name],

Thank you for your gift of $[Amount] to [Fund Name].

Date: [Date]
Amount: $[Amount]
Fund: [Fund Name]
Payment Method: [Last 4 digits]
Receipt ID: [ID]

Your generosity makes a difference!

[Church Name]
Tax ID: [EIN]

---
This email serves as your receipt for tax purposes.
Keep for your records.
```

### Receipt Sending

**Trigger:** Stripe webhook `payment_intent.succeeded` or `invoice.paid`

**Implementation:**
```typescript
async function sendReceipt(contributionId: string) {
  const contribution = await db.contribution.findUnique({
    where: { id: contributionId },
    include: { fund: true, person: true, tenant: true },
  });

  const email = contribution.person?.email || contribution.guestEmail;
  if (!email) return;

  await emailService.send({
    to: email,
    from: `${contribution.tenant.name} <giving@${contribution.tenant.domain}>`,
    subject: `Thank you for your gift to ${contribution.tenant.name}`,
    html: renderReceiptEmail(contribution),
  });

  await db.contribution.update({
    where: { id: contributionId },
    data: { receiptSentAt: new Date() },
  });
}
```

---

## 7. Annual Giving Statements

### PDF Statement

**Generate:** January each year for previous year
**Includes:**
- Donor name and address
- Church name, address, tax ID (EIN)
- Itemized list of all gifts
- Total annual giving
- Tax disclaimer

**Implementation:**
- Use Playwright to render HTML → PDF
- Store in Azure Blob Storage
- Email link to donor

### QuickBooks CSV Export

**Format:**
```csv
Date,Name,Amount,Fund,Payment Method,Receipt ID
01/05/2025,John Smith,100.00,General Fund,Card,abc12345
01/12/2025,John Smith,100.00,General Fund,Card,def67890
```

**Admin Feature:**
- Export all contributions for a date range
- Used for QuickBooks import
- Includes all donors (not just one person)

---

## 8. PCI Compliance

**Stripe Handles:**
- ✅ Card data never touches our servers
- ✅ Stripe.js tokenizes payment methods
- ✅ We only store Stripe IDs, not card numbers
- ✅ PCI DSS compliant by using Stripe Elements

**Our Responsibilities:**
- ✅ Use HTTPS only
- ✅ Webhook signature verification
- ✅ Secure API keys (environment variables, Key Vault)
- ✅ Audit logging of payment actions

**NOT Allowed:**
- ❌ Storing full card numbers
- ❌ Storing CVV codes
- ❌ Building custom payment forms (use Stripe Elements)

---

## 9. Security Checklist

- [x] Use Stripe Elements (no raw card data)
- [x] Verify webhook signatures
- [x] Rate limit giving endpoints (prevent abuse)
- [x] Validate amounts (min $1, max $10,000 per transaction)
- [x] Audit log all payment actions
- [x] Tenant isolation (RLS on contributions table)
- [x] HTTPS only (no HTTP)
- [x] Secure Stripe API keys in Key Vault

---

## 10. Future Enhancements (Post-V1)

- [ ] Pledge tracking
- [ ] Campaign/project giving
- [ ] Stock/crypto donations
- [ ] Text-to-give
- [ ] Kiosk giving (in-person terminal)
- [ ] Multi-currency support
- [ ] Donor portal with tax summaries
- [ ] Matching gifts (employer matching)

---

**Artifacts:**
- `P14_payments.md` (this file)
- `P14_webhooks.ts` (webhook implementation)

**Version:** 1.0
**Date:** 2025-11-14

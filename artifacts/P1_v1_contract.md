# Product V1 Contract: Elder-First Church Platform

**Target Audience:** Churches with <200 members
**Release Target:** 12 weeks from start
**Core Principle:** "One form or it doesn't happen"

---

## V1 Scope

### ✅ MUST HAVE

#### Messaging
- [x] Admin broadcast channels with reply controls
- [x] Announcement feed with priority levels (Urgent/High/Normal)
- [x] Auto-expire announcements by date
- [x] Weekly digest email ("Your Week") sent Mondays 9am
- [x] Push notifications for urgent messages

#### Events & RSVP
- [x] Event creation with date/time/location
- [x] Simple RSVP (Yes/No/Maybe) with headcount
- [x] Event visibility controls (public/members-only)
- [x] Calendar view (month/list)
- [x] ICS import from external calendars

#### People & Groups
- [x] Person directory with basic fields (name, email, phone, photo)
- [x] Household grouping
- [x] Group management (small groups, committees)
- [x] Search and filtering
- [x] Planning Center CSV import

#### Giving (Basic)
- [x] One-time donations via card/ACH
- [x] Recurring gifts (weekly/monthly)
- [x] Apple Pay / Google Pay support
- [x] Fund designation
- [x] Email receipts
- [x] Annual statement export (PDF batch, CSV for QuickBooks)

#### Bulletin Generator
- [x] Single intake form with 3 tabs: Calendar/Service Plan, Announcements, Branding
- [x] Validation: Announcement title ≤60 chars, body ≤300 chars
- [x] CCLI requirement for songs at lock time
- [x] Image validator: ≤4MB, 16:9 aspect ratio with crop tool
- [x] Live character counters
- [x] Template pack: Single sheet + half-letter booklet (4-1, 2-3 imposition)
- [x] Four outputs: PDF (print-ready), Slide loop (JPG sequence + MP4), Web/Email version
- [x] Workflow: Draft → Built (watermarked PROOF) → Locked (immutable)
- [x] Weekly lock enforcement (Admins only)
- [x] Emergency reopen with watermark and audit trail
- [x] ProPresenter export bundle
- [x] Large-print variant (120% scaling)

### 🟡 SHOULD HAVE (if time permits)

#### Messaging
- [ ] Thread replies for announcements
- [ ] SMS fallback for critical alerts
- [ ] Image attachments in messages

#### Events & RSVP
- [ ] Volunteer signup slots
- [ ] Waitlist management
- [ ] Event check-in (QR code)

#### People & Groups
- [ ] Custom fields per tenant
- [ ] Photo uploads for members
- [ ] Birthday/anniversary tracking

#### Bulletin Generator
- [ ] A/B template selection
- [ ] Custom color schemes per week

### ❌ WON'T HAVE (V1 Non-Goals)

#### Out of Scope for V1
- ❌ Full accounting/general ledger integration
- ❌ Payroll or staff time tracking
- ❌ Facilities booking with conflict resolution
- ❌ Sermon archive with transcription
- ❌ Multi-campus parent/child relationships
- ❌ Extensive donor CRM (moves management)
- ❌ Native mobile apps (PWA only; React Native wrapper in V2)
- ❌ Advanced workflow automation/rules engine
- ❌ Third-party integrations beyond ICS and Planning Center CSV
- ❌ Custom report builder
- ❌ Video streaming or hosting

---

## User Modes

### Simple Mode (Members)
**Home Screen:** 4 large buttons
1. **Messages** - View announcements and broadcasts
2. **Events** - See upcoming events and RSVP
3. **People** - Directory search
4. **Give** - Quick donation flow

**Design Requirements:**
- Large text (minimum 18px body, 24px headings)
- High contrast (WCAG AA minimum)
- 48px minimum touch targets
- No jargon (avoid "dashboard," "admin," "portal")
- Font scaling support (120%-200%)

### Admin Mode
Hidden behind role assignment. Unlocks:
- Intake form
- Bulletin issue management
- Role assignments
- Settings (branding, integrations, email/SMS providers)
- Analytics dashboard

**Roles:**
- **Admin** - Full access, can lock/reopen bulletins
- **Editor** - Create and edit content, cannot lock
- **Submitter** - Submit announcements/events for approval
- **Viewer** - Read-only access
- **Kiosk** - Display-only mode for lobby screens

---

## Success Metrics

### Primary Metrics (Week 4-12)

1. **Bulletin Adoption Rate**
   - Target: 80% of onboarded churches publish weekly via platform
   - Measure: `COUNT(locked_bulletins) / COUNT(active_tenants) * 100`

2. **Time to Publish**
   - Target: <30 minutes from intake start to locked bulletin
   - Measure: `AVG(locked_at - created_at)` per issue

3. **Member Engagement**
   - Target: 40% of members open weekly digest email
   - Measure: Email open rate via SendGrid analytics

4. **RSVP Conversion**
   - Target: 25% of event views result in RSVP
   - Measure: `COUNT(rsvps) / COUNT(event_views) * 100`

5. **Giving Activation**
   - Target: 15% of active members give online in first 30 days
   - Measure: `DISTINCT(donor_id) / DISTINCT(active_member_id) * 100`

### Leading Indicators (Weekly)
- Number of intake forms started
- Announcement submissions per church
- Event creation rate
- User login frequency (Admins vs. Members)

---

## 12-Week Roadmap

### Weeks 1-2: Foundation
- [ ] Project scaffolding (Azure, Next.js, PostgreSQL)
- [ ] Multi-tenant data model with RLS
- [ ] Entra B2C authentication + role middleware
- [ ] CI/CD pipeline (dev/stage/prod)
- [ ] Basic observability (App Insights, structured logs)

### Weeks 3-4: Core Data & Auth
- [ ] Person/Household/Group CRUD
- [ ] Event management and RSVP flows
- [ ] Announcement feed with priority and expiration
- [ ] Role assignment UI
- [ ] ICS and Planning Center importers

### Weeks 5-6: Messaging & Giving
- [ ] Admin broadcast channels
- [ ] Weekly digest generator (cron job)
- [ ] Stripe integration (one-time + recurring)
- [ ] Fund management
- [ ] Receipt email templates
- [ ] Statement export (PDF + CSV)

### Weeks 7-8: Bulletin Generator (Part 1)
- [ ] Intake form (3 tabs) with validation
- [ ] Character counters and image validator
- [ ] BrandPack management (logo, colors, fonts)
- [ ] BulletinIssue state machine (draft → built → locked)
- [ ] Template pack (single sheet + half-letter booklet)

### Weeks 9-10: Bulletin Generator (Part 2)
- [ ] Playwright render service (PDF, slides, email)
- [ ] Imposition logic (half-letter 4-1, 2-3)
- [ ] Watermarking (PROOF before lock)
- [ ] Lock enforcement + emergency reopen
- [ ] ProPresenter export bundle
- [ ] CDN publishing for web/email version

### Weeks 11-12: Polish & Launch Prep
- [ ] Accessibility audit (WCAG AA, senior usability)
- [ ] E2E tests (Playwright: intake → lock → download)
- [ ] Admin documentation + Switch-Over Sunday guide
- [ ] Performance testing (50 concurrent tenants)
- [ ] Beta onboarding (5 pilot churches)
- [ ] GTM materials (one-pager, email sequence, pricing page)

---

## Technical Constraints

### Accessibility (Non-Negotiable)
- WCAG 2.1 AA compliance
- Large text defaults (18px minimum)
- High contrast mode
- 48px minimum touch targets
- Keyboard navigation for all actions
- Screen reader tested (NVDA, VoiceOver)
- Font scaling support (up to 200%)

### Bulletin Generator Hard Limits
- Announcement title: 60 characters max
- Announcement body: 300 characters max (overflow → QR to website)
- Images: 4MB max, 16:9 aspect ratio required
- Songs: CCLI# required before lock (validation error if missing)
- Top 3 announcements: Large cards
- Remaining announcements: Two-column grid
- Overflow announcements: "See full list" QR code

### Performance Targets
- Page load: <2s (P75)
- Bulletin PDF render: <10s
- API response time: <300ms (P95)
- Support 50 concurrent tenants in V1

---

## Non-Goals (Scope Protection)

### Explicitly Deferred to V2+
- **Native Mobile Apps:** PWA with "Add to Home Screen" in V1; React Native wrapper later
- **Advanced Reporting:** Custom report builder and BI dashboards → V2
- **Multi-Site Churches:** Parent/child campus relationships → V2
- **Volunteer Scheduling:** Shift management and conflict resolution → V2
- **Full Accounting:** GL integration, fund accounting, payroll → Partner integration or V3
- **Content Management:** Sermon library, video hosting, website builder → V2
- **Advanced Automation:** Workflow engine, conditional logic, zapier-style rules → V2

### Permanent Non-Goals
- **Doctrinal Positioning:** Platform is theologically neutral
- **Streaming Services:** Use existing tools (YouTube, Vimeo); we won't compete
- **Email Service Provider:** Integrate with SendGrid/Mailgun; don't build our own
- **Payment Processing:** Use Stripe; don't become a payment processor

---

## Success Criteria for V1 Launch

### Must Pass Before GA
1. **5 pilot churches** complete 4 consecutive weekly bulletins
2. **Zero P0 bugs** in production for 2 consecutive weeks
3. **Accessibility audit** passes WCAG AA + senior usability test (2 volunteers 65+)
4. **E2E test suite** green with >80% coverage on critical paths
5. **Admin docs** complete and validated by non-technical church admin

### Launch Readiness Checklist
- [ ] Blue/green deployment tested in staging
- [ ] Rollback plan documented and rehearsed
- [ ] Monitoring dashboards live (uptime, errors, performance)
- [ ] Support email/chat staffed (9am-5pm ET, Mon-Fri)
- [ ] Pricing page live with Stripe checkout
- [ ] Legal docs ready (Terms, Privacy, DPA for church data)

---

## Appendix: Terminology

**Elder-First UX Principles:**
- Assume low tech literacy; optimize for 65+ age group
- Avoid jargon: Say "Messages" not "Announcements Module"
- Prioritize clarity over features: One primary action per screen
- Provide undo/confirmation for destructive actions
- Large, high-contrast UI with generous whitespace

**"One Form or It Doesn't Happen" Policy:**
The intake form is the single source of truth for Sunday service content. If it's not in the form by Friday 5pm, it doesn't go in the bulletin. This prevents last-minute chaos and ensures print deadlines are met.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Owner:** Product Lead
**Stakeholders:** Engineering, Design, Customer Success


# Elder-First Church Platform – Future Features Roadmap

This roadmap prioritizes features by **ROI (impact)** and **complexity**, based on the current state of your Worship / Preach / Analytics stack.

- **ROI:** 1–5 (5 = big impact on adoption/retention)  
- **Complexity:** 1–5 (5 = lots of surface area / new models)  
- **Priority:** Now / Next / Later  

---

## Phase 1 – “Exploit the Worship Suite” (High ROI, Low–Medium Complexity)

These are adjacent to what already exists (Service Order V2, Preach Mode, Bulletin/Canvas, Analytics).

### 1. Reusable Service Templates (Communion Sunday, Youth Sunday, etc.)

- **ROI:** 5  
- **Complexity:** 2  
- **Priority:** **Now**  
- **Why:**  
  - Builds directly on Service Order V2 and copy-from-previous.
  - Used every single week; saves real time and reduces mistakes.
- **Shape:**  
  - “Save as Template” from a well-built service.  
  - Template library with tags (Communion, Baptism, Advent, Youth).  
  - “Start from Template” when creating a new bulletin/service.

---

### 2. Multi-service Planning (9am / 11am / Saturday)

- **ROI:** 5  
- **Complexity:** 3  
- **Priority:** **Now**  
- **Why:**  
  - Essential for larger churches; lets them plan multiple services without duplicating everything.
- **Shape:**  
  - One “Service Plan” with **service instances** (9:00, 11:00, Saturday).  
  - Shared core (songs, sermon, flow) with per-instance overrides (announcements, timing tweaks).

---

### 3. Song Library with Arrangements + CCLI

- **ROI:** 5  
- **Complexity:** 3–4  
- **Priority:** **Now**  
- **Why:**  
  - Worship leaders think in “songs and arrangements”, not just rows in a service.
  - You already store song data on service items; this normalizes it.
- **Shape:**  
  - Song catalog:
    - Title, CCLI, keys, default arrangement, tags.  
    - Service items link to songs instead of just free text.  
  - Reporting:
    - “Top songs last 12 months”, “New songs we introduced this year”.

---

### 4. Announcement Planner (Pipeline → Bulletin / Stage / Email)

- **ROI:** 5  
- **Complexity:** 3  
- **Priority:** **Now**  
- **Why:**  
  - Weekly pain: keeping announcements consistent across stage, bulletin, and communications.
  - If you become the **source of truth** for announcements, you own a key workflow.
- **Shape:**  
  - Central Announcement table:
    - Title, body, start date, end date, channels (Stage, Bulletin, Email, Web, Social).  
  - Integrations:
    - Bulletin: pulls “current” announcements.  
    - Service Order: stage announcements show clearly.  
    - Later: email and website content from the same records.

---

### 5. AI-Assisted Weekly “This Week” Email

- **ROI:** 4  
- **Complexity:** 2–3  
- **Priority:** **Now**  
- **Why:**  
  - Obvious value: saves staff 30–60 minutes/week writing weekly updates.
  - Leverages structured data you’re already collecting.
- **Shape:**  
  - From a given Sunday:
    - Use bulletin + announcements + events → draft a “This Week at [Church]” email.  
    - User edits and sends in their email system (no need to become Mailchimp in v1).

---

### 6. Onboarding Wizard for New Churches

- **ROI:** 4  
- **Complexity:** 2  
- **Priority:** **Now**  
- **Why:**  
  - You’ve built a sophisticated suite; first-run experience needs to be guided.
  - Goal: get them to “first planned service + printable bulletin + Preach Mode” in one guided flow.
- **Shape:**  
  - Steps:
    1. Set church basics (name, logo, default colors).  
    2. Pick default service time(s).  
    3. Choose a base service template (Simple / Traditional / Modern).  
    4. Add first sermon title + scripture.  
    5. Auto-create first bulletin & service; show Print + Preach buttons.

---

## Phase 2 – “Own the Worship + Comms + Volunteer Triangle”

These expand you from worship into communications and volunteers.

### 7. Basic Volunteer Scheduling per Service (Worship, Tech, Greeters)

- **ROI:** 5  
- **Complexity:** 4  
- **Priority:** **Next**  
- **Why:**  
  - Directly tied to services (which you already model well).
  - Being the place where worship, tech, and greeter schedules live is a big moat.
- **Shape (v1):**  
  - Per service instance:
    - Positions: Worship Leader, Vocalist, Keys, Drums, Sound, Slides, Greeter, etc.  
    - Manually assign people.  
    - Output: read-only schedule for teams (and possibly Preach/Booth/print views).
  - No complex availability logic yet; that’s a Phase 2.5 problem.

---

### 8. Group Directory & Signup

- **ROI:** 4  
- **Complexity:** 3–4  
- **Priority:** **Next**  
- **Why:**  
  - Small groups are central in many churches; signups and visibility are consistent pain points.
- **Shape:**  
  - Public + internal group listing:
    - Name, leader, day/time, general location, life-stage tags.  
  - Simple signup:
    - Name/email/phone → attached to a group; leadership sees the list.

---

### 9. Event Registration & Bulletin/Announcement Integration

- **ROI:** 4  
- **Complexity:** 3–4  
- **Priority:** **Next**  
- **Why:**  
  - Events generate a lot of communication and admin work.
  - If events automatically show up in bulletins & announcements, that’s real leverage.
- **Shape:**  
  - Event model:
    - Title, date(s), location, registration-enabled flag.  
  - Registration:
    - Simple registrations (name/email/phone/guest count) with export.  
  - Integration:
    - Events opted into “Bulletin” appear in upcoming bulletins.  
    - Events opted into “Announcements” show in the Announcement Planner.

---

### 10. Sermon Archive + Public Page

- **ROI:** 4  
- **Complexity:** 3–4  
- **Priority:** **Next**  
- **Why:**  
  - Sermon archive is a high-visibility feature for visitors.
  - You already have sermon + analytics infrastructure; this exposes it externally.
- **Shape:**  
  - Public pages:
    - Sermon list by series, preacher, date.  
    - Detail with notes, scripture, and media links.  
  - Driven entirely by existing internal sermon entities.

---

## Phase 3 – “Deepen the Suite” (Higher Complexity, Strategic Bets)

Bigger bets that move you toward full church management. Do these after Phase 1–2 are stable.

### 11. Kids Check-in (Basic) + Security Codes

- **ROI:** 5 (for churches that need it)  
- **Complexity:** 5  
- **Priority:** **Later**  
- **Why:**  
  - Critical for family-heavy churches, but operationally sensitive (security, hardware, UX).
- **Shape (v1):**  
  - Class rosters tied to service instance.  
  - Unique security codes per check-in.  
  - Manual check-in/out system with on-screen codes (labels later).

---

### 12. Full Email & SMS Campaigns

- **ROI:** 4–5  
- **Complexity:** 5  
- **Priority:** **Later**  
- **Why:**  
  - Deep owning of communications = very sticky, but high complexity (compliance, unsubscribes, deliverability).
- **Shape (v1):**  
  - Only after:
    - Announcement Planner  
    - AI weekly email drafts  
  - Then:
    - Lists (Members, Volunteers, Guests).  
    - Campaigns (Weekly update, event reminders, group invites).

---

### 13. Giving Campaigns & High-level Giving Dashboard

- **ROI:** 4–5  
- **Complexity:** 5  
- **Priority:** **Later**  
- **Why:**  
  - Money is a top concern, but integrations + politics make it delicate.
- **Shape (v1):**  
  - Read-only integration to giving provider.  
  - Campaigns (Building Fund, Missions) tied into bulletins + emails.  
  - No full accounting.

---

### 14. Multi-campus Structure (Org → Campus → Service)

- **ROI:** 4 (for larger/multi-site churches)  
- **Complexity:** 5  
- **Priority:** **Later**  
- **Why:**  
  - Very attractive for big clients, but complicates everything: auth, analytics, routing, configuration.
- **Shape (v1):**  
  - Explicit Campus entity.  
  - Campus-scoped bulletins, services, and analytics.  
  - Role scoping per campus.

---

## Immediate “Do This Next” Shortlist

If you want a blunt execution order, build in roughly this sequence:

1. **Reusable Service Templates**  
2. **Multi-service Planning (shared plan with multiple times)**  
3. **Song Library + Arrangements + CCLI normalization**  
4. **Announcement Planner with automatic bulletin/stage integration**  
5. **AI “This Week” email drafts (from bulletin + announcements + events)**  
6. **Onboarding Wizard that walks a new church to first service + bulletin**  
7. **Basic Volunteer Scheduling per service instance**

Each of these can be turned into a concrete implementation prompt (like you’ve been doing) with:

- Data model changes  
- TRPC routes  
- UI components + routing  
- Tests  
- And a mandatory **“Update documentation”** step

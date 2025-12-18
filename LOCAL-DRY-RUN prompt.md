You are an AI developer working INSIDE my “church platform” monorepo.

Objective: Walk me through a FULL LOCAL DRY RUN using the dev pastor account, so I can prove everything works end-to-end on localhost before I deploy anything.

You MAY fix config/code only if something is clearly broken. Otherwise, read-only and instruct.

────────────────────
ASSUMPTIONS (CHECK, DON’T TRUST)
────────────────────

Do a quick read-only sanity check that ALL of these are true in the current repo:

1. Auth:
   - apps/web/src/auth.ts contains a dev user:
     - email: pastor@testchurch.local
     - password: test123
     - some admin-level role
     - tenantId that matches the First Test Church tenant in the DB seed.

2. Seed:
   - packages/database/src/seed.ts:
     - Creates “First Test Church” tenant.
     - Seeds people, sermons, events, donations, thank-you notes.

3. DB & Docker:
   - docker-compose.yml defines a Postgres container:
     - Port 5445 (or whatever is actually configured).
     - User/password (likely postgres/postgres).
     - DB name (likely elder_first).

4. Env:
   - .env.example / .env.local patterns exist for:
     - packages/database
     - apps/api
     - apps/web
   - There is some kind of DEV_MODE flag for web/auth.

If any of these are FALSE or obviously wrong, FIX them in the smallest possible way and tell me exactly what you changed. Otherwise, leave code alone.

────────────────────
WHAT I WANT FROM YOU
────────────────────

Deliver **three things**:

1) A single, ordered list of TERMINAL COMMANDS to run from a clean state.
2) A BROWSER CLICK-THROUGH CHECKLIST as the dev pastor.
3) A short “if something breaks, check this first” section.

Keep everything current with the repo as it exists when you run this. Don’t copy-paste old values; derive them from the files.

────────────────────
PART 1 – TERMINAL COMMANDS (LOCAL ONLY)
────────────────────

Output a numbered list of commands I should run from the repo root to do a full local dry run, assuming nothing is running yet.

It should include, in order:

1. Start Postgres with Docker (using the actual service name/ports).
2. Create .env.local files from .env.example for:
   - packages/database
   - apps/api
   - apps/web
   Include whether I need to edit anything or they’re ready as-is.
3. Install dependencies (if needed) – e.g. `npm ci` or equivalent.
4. Run DB migrations for local DB.
5. Run the seed script that creates the First Test Church data.
6. Start the API dev server (exact command and expected port).
7. Start the Web dev server (exact command and expected port).
8. The exact URL I should open in the browser (e.g. http://localhost:3045).

For EACH step, add 1–2 bullets of:
- What success looks like (log messages, output).
- What to ignore (e.g., harmless warnings).

Do NOT skip steps. Assume I’m doing this from a cold machine.

────────────────────
PART 2 – BROWSER CLICK-THROUGH (AS PASTOR)
────────────────────

After I’ve run the commands and both servers are up, give me a short, brutal checklist of what to do in the browser, as the dev pastor user.

Use whatever the repo actually supports, but target this flow:

1) Login
   - URL: (the one from Part 1).
   - Email: pastor@testchurch.local (or whatever the code actually uses).
   - Password: test123 (or whatever the code actually uses).
   - What I should see on successful login (dashboard, church name, etc.).

2) Sermons
   - How to navigate to the sermons list.
   - Verify some seeded sermons exist.
   - Open one sermon; what to confirm on the detail page.

3) Bulletins
   - How to navigate to bulletins.
   - Open the next Sunday bulletin.
   - Confirm a sermon item is present and linked.
   - Click the sermon link and verify it goes to the correct sermon.

4) Thank-You Notes – Global
   - How to open the global thank-you notes view.
   - What seeded notes I should expect to see.
   - Try one simple filter (e.g. by channel or date) and confirm it behaves.

5) Thank-You Notes – Person
   - From global notes or People list, open a person that has a note.
   - Confirm the “Thank-You Notes” section shows at least one note.
   - Log a new note and verify it appears.

6) Donation / Event Detail (if supported)
   - Open a donation detail page and confirm a thank-you section exists.
   - Open an event detail page and confirm a thank-you section exists.

7) Error checks
   - Instruct me to check the browser console for red errors.
   - Instruct me to glance at the API terminal for stack traces or SQL errors.

Make this list tight enough that I can do it in ~15–20 minutes.

────────────────────
PART 3 – QUICK TROUBLESHOOTING HINTS
────────────────────

At the end, give me a SHORT “if something’s broken, check this first” list:

- 3–7 bullets like:
  - “If you can’t log in as pastor, verify DEV_MODE and dev user config in apps/web/src/auth.ts.”
  - “If the dashboard is empty, verify seed ran successfully and tenant IDs match.”
  - “If the web UI can’t talk to the API, check the API URL env vars and ports.”

Do not repeat the whole runbook; this is just a quick “triage” list.

────────────────────
IMPORTANT
────────────────────

- Local only. NO Azure, NO staging, NO B2C wiring in this prompt.
- Only change code/config if you find a clear blocker to the local dry run.
- Otherwise, treat the repo as read-only and just output the run steps + checks.

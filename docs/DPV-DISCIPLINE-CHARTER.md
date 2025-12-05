Developer Prompt Vault (DPV) Discipline Charter
1. Purpose

DPV exists for one reason:
Make AI-assisted dev work consistent, safe, and fast.

If a behavior, workflow, or decision isn’t encoded in DPV, it is not “official” and should not be relied on.

2. What DPV Is and Is Not

DPV IS:

The single source of truth for:

Session guardrails for AI tools.

Project-specific guardrails.

Reusable task workflows (prompts).

Drift-check prompts.

A curated, high-signal vault of “how I work with AI.”

DPV IS NOT:

A dumping ground for random notes, code snippets, or design docs.

A place to store secrets, tokens, passwords, or raw config values.

A replacement for repo docs (architecture, domain rules, etc.).

3. Daily Operating Rules

3.1. Starting an AI session

For every serious Claude Code (or other AI coding) session:

Load session guardrails via DPV:

SESSION-GUARDRAILS-VERDAIO

Load repo guardrails:

e.g., CHURCH-PLATFORM-GUARDRAILS, HOA-PLATFORM-GUARDRAILS, etc.

Paste both before any other instruction and tell the model:

“These are non-negotiable. If I contradict them, warn me.”

If you don’t start with guardrails from DPV, you’re off-script. That’s on you.

3.2. Doing actual work

For any repeatable task (fix build, add feature, security review, CI change, etc.):

Use a DPV task prompt, not freestyle instructions.

Examples:

FIX-BUILD-ERRORS-NEXTJS

IMPLEMENT-FEATURE-WITH-DOCS-AND-TESTS

SECURITY-REVIEW-API-ENDPOINT

Fill in the variables (repo name, feature, file path, etc.).

Paste the filled prompt, then the context (errors, diffs, specs).

If you’re typing a long prompt directly into Claude and it’s obviously reusable, stop and turn it into a DPV entry immediately.

4. Prompt Lifecycle Rules

4.1. Creating Prompts

A new prompt belongs in DPV if:

It’s generic enough to apply again (not just a one-off debug).

It encodes a process, not just a single answer.

It can be described in a short, clear name and description.

Every important prompt MUST include:

Clear goal.

Step-by-step workflow.

Explicit guardrails:

What to avoid (e.g., no secrets, no changing stack choices without approval).

Requirements (tests, docs, security considerations).

4.2. Updating Prompts

When a prompt needs adjusting (stack changed, guardrails changed):

Update it in DPV, bump version, and fix it once.

Do not hack around it ad-hoc in the chat and move on.

If you intentionally change a rule, update:

Session guardrails,

Project guardrails,

Any directly impacted task prompts.

4.3. Retiring Prompts

Once a month:

Delete or archive prompts that:

Have used_count = 0 for > 30 days, or

Are clearly obsolete (old folder structures, outdated tools).

Merge overlapping prompts where possible.

If DPV starts feeling noisy, you’re not pruning hard enough.

5. Security Rules (Non-Negotiable)

No secrets in DPV.

Only use placeholders like {{AZURE_CLIENT_ID}}, never real values.

prompts.db and exports:

MUST be in .gitignore.

MUST be treated as internal, sensitive artifacts.

Prompts that touch auth, infra, or data access MUST include:

Security guardrails.

“No secrets in code or config” instructions.

Preference for AAD/OIDC patterns and least-privilege access.

If a prompt would be embarrassing or dangerous to leak, tighten it.

6. Drift Control Rules

6.1. Mid-session drift check

When a session starts to sprawl, or after a major chunk of work:

Use a drift-check prompt from DPV:

e.g., DRIFT-CHECK-SESSION

Have the model:

Compare its suggestions against:

Session guardrails,

Project guardrails,

Task prompt.

Call out violations (stack changes, security shortcuts, missing tests/docs).

You don’t trust the model; you force it to cross-check itself.

6.2. Pre-commit / PR-level drift check

Before treating a change as “done”:

Use DRIFT-CHECK-PR (or equivalent) with:

Summary of changes or diff,

The prompts that guided the work.

Require:

Confirmation that guardrails were respected.

List of missing tests/docs if any.

Note any architectural deviation that needs explicit sign-off.

If the model admits it ignored rules and you ship anyway, that’s on you.

7. Review Cadence

Weekly (15–20 min):

Run dpv top and dpv recent:

Ensure your most-used prompts still match your current architecture and practices.

Fix:

Paths,

Tech assumptions,

Security rules.

Kill or merge prompts that are clearly redundant.

After major tech or architecture changes:

Search DPV for relevant keywords (e.g., “Canvas”, “bulletin”, “RLS”, “Next.js 14”).

Update or retire anything that is now wrong.

8. Exceptions Policy

You are allowed to temporarily go off-DPV only when:

You are exploring something genuinely new (prototype, idea, tech you haven’t decided to keep).

Or you’re doing a quick throwaway experiment.

If the pattern from that experiment proves useful:

It MUST be turned into a DPV prompt before you treat it as part of your normal workflow.

If you catch yourself saying “I’ll remember how I told Claude to do this last time”, you’re already violating the charter.
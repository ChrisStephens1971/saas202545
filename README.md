
# Church Platform Starter Pack

This zip gives you two specs and a Claude Code runbook so you can start building without rummaging through ten chats.

## What’s inside
- `docs/bulletin-generator-spec.md` — Bulletin Generator, soup to nuts.
- `docs/elder-first-church-platform.md` — Full platform spec (elder‑first).
- `prompts/claude/claude_runbook.yaml` — Ordered build tasks with dependencies and acceptance criteria.
- `prompts/claude/claude_prompts.jsonl` — One task per line (for tools that like streams).
- `prompts/claude/README.md` — How to run the prompts without drama.

## Fast start (copy/paste)
1. Unzip to your repo root.
2. Open `prompts/claude/README.md` and follow the 6‑step loop.
3. For V1, run tasks P1 → P3 → P5 → P6 → P8 → P9 → P10 → P11 → P18 in order.
4. Keep all generated files in `/artifacts` with the exact filenames from `claude_runbook.yaml`.
5. Use `docs/bulletin-generator-spec.md` during P8–P11. Use `docs/elder-first-church-platform.md` for everything else.

## Sanity rules
- One intake form or it doesn’t ship.
- Lock the bulletin by Thursday 2pm. Emergency reopen slaps a timestamp on every output.
- Templates are locked; no “creative” layout changes before Sunday.

# Planner Blueprint

Reusable pattern for building planner-style applications using `@elder-first/planner-core`.

## Purpose

This blueprint provides a standardized approach for implementing planners (agendas, rundowns, schedules) that share the same hierarchical structure:

```
Plan → Sections → Items
```

Each item has a type, title, duration, and optional metadata. The core package handles time calculations, outline generation, and type definitions—your vertical just extends them.

## Related Documentation

- [Planner Pattern](../../docs/template-system/PLANNER-PATTERN.md) — Canonical pattern documentation
- [Church UI Direction](../../docs/ui/CHURCH-UI-DIRECTION.md) — Reference implementation (Sunday Planner)

## What This Blueprint Does NOT Define

- **UI components** — Your vertical owns its React/Vue/Svelte components
- **Backend/API** — Persistence, auth, and tenants belong in your vertical
- **Styling** — Colors, icons, and themes are vertical-specific
- **Database schema** — Each vertical defines its own tables

## When to Use This Blueprint

Use this blueprint when your feature needs:

- [ ] A **plan → sections → items** hierarchy
- [ ] **Duration/timing** calculations (start times, total duration, end time)
- [ ] **Outline generation** (text export, print views)
- [ ] **Item type** categorization with defaults
- [ ] To **avoid re-implementing** time math and structure logic

If you only need one or two of these, consider importing specific utilities from `planner-core` without the full blueprint.

## Contents

| File | Purpose |
|------|---------|
| [blueprint.md](./blueprint.md) | Step-by-step implementation spec |
| [examples/meeting-planner.md](./examples/meeting-planner.md) | Meeting planner vertical example |
| [examples/event-rundown.md](./examples/event-rundown.md) | Production run sheet example |

## Quick Start

1. Read `blueprint.md` for the implementation recipe
2. Review an example that matches your use case
3. Create your vertical's types extending `planner-core`
4. Build your UI using the core utilities

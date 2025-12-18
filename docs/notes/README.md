# Ops Notes

Fleet-wide operational notes and constraints memos.

## Creating a New Note

1. Copy [TEMPLATE-OPS-NOTE.md](./TEMPLATE-OPS-NOTE.md)
2. Rename using one of these patterns:
   - `cc-<slug>-v1.md` (for Claude Code prompt-related notes)
   - `ops-<slug>.md` (for general operational notes)
3. Fill in all required sections
4. Add a link to this README under Contents

## Required Sections

All ops notes must include these headings (enforced by CI):

- `## Purpose`
- `## When to use this`
- `## Applies to`
- `## Does not apply to`
- `## Constraints`
- `## Follow-ups`

## Filename Convention

| Pattern | When to use | CI Enforcement |
|---------|-------------|----------------|
| `cc-*-v1.md` | Claude Code prompt-related notes | WARN (default) |
| `ops-*.md` | General operational notes | WARN (default) |
| Other | Not recommended | WARN (default) |

Set `OPS_NOTES_STRICT_FILENAMES=true` in CI to treat filename violations as errors.

## Contents

<!-- Add links to ops notes here -->

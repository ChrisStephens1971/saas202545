# Reporting & Analytics

This directory contains documentation for all reporting and analytics capabilities in **Elder-First Church Platform**.

## Contents

| Document | Purpose |
|----------|---------|
| [REPORTING-INVENTORY.md](./REPORTING-INVENTORY.md) | What reporting surfaces exist (APIs, pages, exports) |
| [GAP-ANALYSIS.md](./GAP-ANALYSIS.md) | What's missing, prioritization, and roadmap |

## CI Gate: Reporting Inventory Enforcement

**When you change reporting-related code, you must update REPORTING-INVENTORY.md or CI will fail.**

The CI workflow includes a "Reporting Inventory Gate" that runs on every PR. It detects changes to:

- **Backend**: Routes/services containing `metrics`, `errors`, `reconciliation`, `report`, `export`
- **Backend paths**: Files in `/metrics/`, `/errors/`, `/reconciliation/` directories
- **Frontend**: Pages containing `Metrics`, `Reliability`, `Reconciliation`, `Report`, `Usage`
- **Frontend**: Services containing `metrics`, `errors`, `reconciliation`, `report`, `usage`
- **Frontend**: Any file in a `/reporting/` directory (excluding docs)

If any of these patterns match and `docs/reporting/REPORTING-INVENTORY.md` is not in the PR, CI fails.

### N/A Exceptions

If the reporting change is trivial (e.g., renaming a variable, fixing a typo), you may mark the PR as exempt by adding this to the PR description:

```
Reporting Inventory: N/A
Reason: [your justification]
```

This does not bypass the gate automatically - it serves as documentation for reviewers to manually approve.

### Running the Check Locally

```bash
# Run the check against your current changes
node scripts/check-reporting-inventory.mjs

# Run with verbose output
node scripts/check-reporting-inventory.mjs --verbose

# Test with specific files (for debugging)
node scripts/check-reporting-inventory.mjs --files="api/src/routes/metrics.routes.ts"
```

---

## Quick Reference

### When to Update These Docs

- **REPORTING-INVENTORY.md**: Update when you add, modify, or remove any:
  - Backend API endpoint that returns metrics, analytics, or reports
  - Frontend page that displays data summaries, charts, or tables
  - Export functionality (CSV, JSON, PDF)
  - Dashboard widgets or summary cards

- **GAP-ANALYSIS.md**: Update when you:
  - Close a gap (mark as CLOSED with date)
  - Identify a new gap (add with severity)
  - Reprioritize existing gaps

### Documentation Requirements

Per the Development SOP, all reporting changes require:

1. **API Contract Documentation**: Document request/response shapes
2. **Hardening Verification**: Confirm rate limiting, pagination, auth
3. **Test Coverage**: Add/update tests for new functionality
4. **REPORTING-INVENTORY.md Update**: Keep the inventory current

## Related Documentation

- [API Contract Guide](../api/API-CONTRACT-GUIDE.md) - API documentation standards
- [Development SOP](../ops/DEVELOPMENT-SOP.md) - Standard development lifecycle
- [STATUS.md](../../STATUS.md) - Project status including Reporting & Analytics section

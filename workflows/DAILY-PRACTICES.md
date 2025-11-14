# Daily & Weekly Practices v2.1

**Version:** 2.1
**Last Updated:** 2025-11-09

---

## 🎯 Purpose

This document defines the **daily and weekly practices** that ensure project health, code quality, and steady progress. These practices are integrated into the [Project Lifecycle Workflow](../PROJECT-WORKFLOW.md) and are **mandatory** throughout all phases.

---

## Table of Contents

- [Daily Routine](#daily-routine)
- [Weekly Practices](#weekly-practices)
- [Phase-Specific Adjustments](#phase-specific-adjustments)
- [GitHub Health Integration](#github-health-integration)
- [Troubleshooting](#troubleshooting)

---

## 📅 Daily Routine

### Morning Routine (15-30 minutes)

Complete these steps **before** starting new work:

#### 1. Check GitHub Actions Health (5-10 minutes)

```bash
cd /c/devop/saas202545
bash scripts/check-github-health.sh
```

**Expected output if healthy:**
```
=== GitHub Health Check ===
Repository: ChrisStephens1971/saas202545

📊 Latest Workflow Runs (last 10):
✅ success - Test Suite (master)
✅ success - CI/CD Pipeline (master)
✅ success - Lint & Type Check (master)

✅ No recent failures - GitHub Actions healthy
```

**If failures found:**
- **STOP** - Do not proceed with new work
- View failure logs: `gh run view --log`
- Fix the error immediately
- Re-run workflow: `gh run rerun <run-id>`
- Verify fix before continuing

**Zero-tolerance policy:** Never ignore failing workflows.

#### 2. Review Yesterday's Work (5-10 minutes)

```bash
# Check yesterday's commits
git log --oneline --since="yesterday" --author="$(git config user.email)"

# Check recent branches
git branch --sort=-committerdate | head -5

# Check pull requests
gh pr list --limit 5
```

**Review:**
- Did yesterday's work complete as planned?
- Any PRs awaiting review?
- Any code review feedback to address?
- Any notifications or mentions?

#### 3. Plan Today's Tasks (10-15 minutes)

**Open workflow checklist:**
```bash
# View current phase and tasks
cat .project-workflow.json | jq '.currentPhase, .phases[.currentPhase].checklist'
```

**Select 1-3 tasks for today:**
- Choose based on:
  - Current phase priorities
  - Blockers (unblock others first)
  - Dependencies (prerequisite for other work)
  - Complexity (mix easy and hard tasks)

**Update task status to in-progress:**
```json
// In .project-workflow.json
{
  "id": "dev-02",
  "task": "Complete Sprint 2 (key workflows)",
  "status": "in-progress",  // ← Update from "pending"
  "startedDate": "2025-11-09"
}
```

**Document plan:**
- Write down 3 goals for today
- Note any potential blockers
- Set time estimates (realistic)

---

### During Work

#### 1. Commit Frequently

**Minimum:** Once per day
**Recommended:** Multiple times per day (2-5 commits)

**Commit best practices:**
```bash
# Use conventional commits
git commit -m "feat: add user profile page"
git commit -m "fix: correct authentication redirect"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for user service"
git commit -m "refactor: simplify database query logic"
```

**Conventional commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Test additions/changes
- `refactor:` - Code refactoring (no behavior change)
- `perf:` - Performance improvement
- `chore:` - Build/tooling changes
- `style:` - Code formatting (no logic change)

**Commit size:**
- **Ideal:** 50-200 lines changed per commit
- **Too small:** <10 lines (unless trivial fix)
- **Too large:** >500 lines (break into smaller commits)

#### 2. Update Progress (10-15 minutes total per day)

**Update `.project-workflow.json` as you complete tasks:**

```json
// Mark task as completed
{
  "id": "dev-02",
  "task": "Complete Sprint 2 (key workflows)",
  "status": "completed",  // ← Update from "in-progress"
  "completedDate": "2025-11-09"
}
```

**Recalculate completion percentage:**
```javascript
// Formula
const completedTasks = checklist.filter(t => t.status === 'completed').length
const totalTasks = checklist.length
const completionPercent = Math.round((completedTasks / totalTasks) * 100)
```

**Update phase status if needed:**
```json
{
  "phases": {
    "development": {
      "status": "in-progress",  // Options: not-started | in-progress | completed
      "completionPercent": 65,   // ← Recalculated
      "lastUpdated": "2025-11-09"
    }
  }
}
```

#### 3. Document Decisions (As needed)

**When to document:**
- Made an architecture decision → Create ADR
- Chose between alternatives → Document why
- Solved a complex problem → Add inline comments
- Changed API → Update API docs
- Fixed a tricky bug → Add comment explaining fix

**Use Architecture Decision Records (ADRs):**
```bash
# Create new ADR
cp technical/adr-template.md technical/adr/001-use-postgresql.md

# Fill in:
# - Context (what problem)
# - Decision (what you chose)
# - Consequences (trade-offs)
# - Alternatives (what you didn't choose)
```

**Update README if needed:**
- New dependencies added
- Setup process changed
- Environment variables added
- Deployment process changed

#### 4. Fix Errors Immediately

**GitHub Actions failures:**
- **Fix before next commit**
- Don't accumulate failures
- Pre-push hook will block if failing

**Linting errors:**
- Fix as you code (use editor integration)
- Don't disable linter rules without discussion
- Run `npm run lint:fix` or `black .` frequently

**Test failures:**
- Fix or update tests immediately
- Don't comment out failing tests
- If test is wrong, fix the test
- If code is wrong, fix the code

**TypeScript errors:**
- Fix type errors as they appear
- Don't use `@ts-ignore` or `any` unless necessary
- Proper types prevent bugs

**Security alerts:**
- Address same day
- Update vulnerable dependencies
- Check for security patches
- Test after updates

---

### End of Day (15-30 minutes)

#### 1. Push All Code (5 minutes)

```bash
# Stage all changes
git add .

# Commit with meaningful message
git commit -m "feat: complete user profile implementation"

# Push to remote
git push origin <branch-name>
```

**Pre-push hook will:**
- Check GitHub Actions status
- Block if latest workflow failed
- Show error message with fix instructions

**If blocked:**
- View logs: `gh run view --log`
- Fix the error
- Push again

#### 2. Update Workflow State (10 minutes)

**Update `.project-workflow.json`:**
- Mark completed tasks
- Update completion percentages
- Note any blockers
- Set tomorrow's priorities

**Update `.project-state.json` if needed:**
```json
{
  "workflow": {
    "currentPhase": "development",
    "lastUpdated": "2025-11-09"
  }
}
```

**Document blockers:**
```json
// In .project-workflow.json or separate blockers.json
{
  "blockers": [
    {
      "task": "dev-03",
      "blocker": "Waiting for API key from third-party service",
      "since": "2025-11-08",
      "resolution": "Contact support tomorrow"
    }
  ]
}
```

#### 3. Check GitHub Actions (5 minutes)

```bash
# View latest run
gh run list --limit 1

# If successful, you're done
# If failed, stay and fix (don't leave broken)
```

**Expected:**
```
✓ CI/CD Pipeline  master  push  2m ago  ✓
```

**If failed:**
- View logs immediately
- Fix the error
- Don't leave until green
- Exception: If fix requires >30 min, document and fix tomorrow morning

#### 4. Plan Tomorrow (5-10 minutes)

**Review next tasks:**
- What's next in `.project-workflow.json`?
- Any blockers to address first?
- Any meetings or interruptions tomorrow?

**Set priorities:**
1. High priority: Blockers, failures, critical bugs
2. Medium priority: Planned tasks from checklist
3. Low priority: Tech debt, optimizations, nice-to-haves

**Time box:**
- Don't over-plan
- 3-5 tasks maximum
- Leave buffer for unexpected work

---

## 📆 Weekly Practices

### Monday: Sprint Planning (If in Development Phase)

**Time:** 1-2 hours
**When:** Start of week (morning preferred)
**Participants:** Team (if applicable) or solo review

#### Sprint Review (Previous Sprint)

**Review completed work:**
```bash
# Check last week's commits
git log --oneline --since="1 week ago"

# Count commits
git rev-list --count --since="1 week ago" HEAD

# See changed files
git diff --stat HEAD@{1.week.ago}
```

**Calculate velocity:**
```javascript
// From .project-workflow.json or sprint tracking
const plannedStoryPoints = 20
const completedStoryPoints = 18
const velocity = completedStoryPoints  // Use for next sprint

const completionRate = (completedStoryPoints / plannedStoryPoints) * 100
// 90% completion rate
```

**Document wins and learnings:**
```markdown
## Sprint N Review

### Completed
- Feature X (8 points)
- Feature Y (5 points)
- Bug fixes (5 points)
Total: 18 points

### Incomplete
- Feature Z (2 points) - moved to next sprint

### Velocity
- Planned: 20 points
- Completed: 18 points
- Velocity: 18 points/sprint

### Wins
- Shipped user authentication ahead of schedule
- Resolved all GitHub Actions failures
- Test coverage increased to 75%

### Learnings
- Database migrations slower than expected
- Need to allocate time for code reviews
- Underestimated third-party API integration
```

#### Sprint Planning (Next Sprint)

**Select user stories:**
1. Review backlog (from roadmap or product/backlog.md)
2. Select stories based on:
   - Priority (Now > Next > Later)
   - Dependencies (prerequisites first)
   - Velocity (don't overcommit)
   - Team capacity (vacations, etc.)

**Break into tasks:**
```markdown
## Sprint N+1 Plan

### Goal
Implement core payment processing

### User Stories
1. As a user, I can add a payment method (8 points)
   - Backend: Stripe integration
   - Frontend: Payment form
   - Tests: Payment flow tests

2. As a user, I can view payment history (5 points)
   - Backend: Payment history API
   - Frontend: History page
   - Tests: History retrieval tests

3. Bug fixes (2 points)
   - Fix profile image upload
   - Fix email notification timing

Total: 15 points (based on last sprint velocity of 18)
```

**Set sprint goal:**
- Single sentence describing sprint outcome
- Example: "Users can manage payments end-to-end"

**Use template:**
```bash
cp sprints/sprint-plan-template.md sprints/sprint-N+1-plan.md
```

### Wednesday: Mid-Week Check

**Time:** 30 minutes
**When:** Mid-week (Wednesday afternoon)
**Purpose:** Ensure on track for sprint/phase goals

#### Progress Review

**Check sprint progress:**
```javascript
// Calculate mid-sprint progress
const daysSinceSprintStart = 3
const sprintLengthDays = 5  // Mon-Fri
const expectedProgress = (daysSinceSprintStart / sprintLengthDays) * 100  // 60%

const actualProgress = 45%  // From completed tasks

if (actualProgress < expectedProgress - 10) {
  // Behind schedule, need to adjust
}
```

**Questions to ask:**
- Are we on track for sprint/phase goals?
- Any blockers that need addressing?
- Should we adjust scope or priorities?
- Do we need help or resources?

**Adjust if needed:**
- De-scope low-priority tasks
- Get help on blockers
- Shift priorities
- Communicate delays early

#### GitHub Health Trend

**Review workflow success rate:**
```bash
# Get last 20 runs
gh run list --limit 20 --json conclusion

# Calculate success rate
# Example: 18 success, 2 failures = 90% success rate
```

**Target:** ≥95% success rate

**If below target:**
- Identify recurring failures
- Plan fixes
- May indicate flaky tests or infrastructure issues

### Friday: Sprint Review & Retrospective

**Time:** 1-2 hours
**When:** End of week (Friday afternoon)
**Purpose:** Review sprint, reflect, and improve

#### Sprint Review

**Demo completed features:**
- Show working software
- Test critical paths
- Verify acceptance criteria met

**Update workflow:**
```json
// In .project-workflow.json
{
  "phases": {
    "development": {
      "checklist": [
        {
          "id": "dev-02",
          "task": "Complete Sprint 2 (key workflows)",
          "status": "completed",
          "completedDate": "2025-11-09"
        }
      ]
    }
  }
}
```

**Document deliverables:**
```markdown
## Sprint N Deliverables

### Features Shipped
- User authentication (✓)
- User profile management (✓)
- Email notifications (✓)

### Metrics
- Commits: 42
- PRs merged: 8
- Lines of code: +1,245 / -320
- Test coverage: 75% (+5%)
- GitHub Actions success rate: 98%
```

#### Retrospective

**Use template:**
```bash
cp sprints/retrospective-template.md sprints/sprint-N-retrospective.md
```

**Discuss:**
1. **What went well?**
   - Celebrate wins
   - Identify successful practices
   - Note what to continue

2. **What didn't go well?**
   - Identify pain points
   - No blame, focus on process
   - Be honest

3. **What should we change?**
   - Concrete action items
   - Assign owners
   - Set deadlines

**Example retrospective:**
```markdown
## Sprint N Retrospective

### What Went Well
- All GitHub Actions stayed green
- Code reviews completed within 24 hours
- Team collaboration was excellent
- Shipped ahead of schedule

### What Didn't Go Well
- Underestimated database migration time
- Flaky tests caused delays
- Documentation fell behind
- Didn't allocate time for bug fixes

### Action Items
1. Add 20% buffer for database work (Owner: Dev team)
2. Fix flaky tests before next sprint (Owner: QA)
3. Allocate 10% of sprint for documentation (Owner: All)
4. Reserve 2 points per sprint for bugs (Owner: PM)

### Metrics
- Sprint completion: 90%
- Velocity: 18 points
- Test coverage: 75%
- GitHub Actions success: 98%
```

### Weekly Health Checks

#### Security Alerts (Friday)

```bash
# Check Dependabot alerts
gh api repos/{owner}/{repo}/dependabot/alerts

# Check security advisories
npm audit  # or pip-audit, etc.
```

**Triage alerts:**
- **Critical:** Fix immediately
- **High:** Fix within 7 days
- **Medium:** Fix within 30 days
- **Low:** Fix when convenient

**Update dependencies:**
```bash
# Check outdated packages
npm outdated  # or pip list --outdated

# Update non-breaking
npm update

# Test after updates
npm test
```

#### Dependency Updates (Friday)

**Check for updates:**
```bash
# JavaScript
npm outdated

# Python
pip list --outdated

# Check for security issues
npm audit
```

**Update strategy:**
- **Patch versions:** Update automatically (1.2.3 → 1.2.4)
- **Minor versions:** Update weekly (1.2.0 → 1.3.0)
- **Major versions:** Test in separate branch (1.0.0 → 2.0.0)

#### Documentation Review (Friday)

**Check if docs need updates:**
- README accurate?
- API docs up to date?
- ADRs reflect current decisions?
- Deployment docs current?

**Update as needed:**
```bash
# Update README
vi README.md

# Update API docs
vi technical/api-spec.md

# Update deployment docs
vi workflows/deployment-runbook.md
```

---

## 🔷 Phase-Specific Adjustments

### Planning Phase Adjustments

**Daily practices:**
- **Commits:** Mostly documentation (ADRs, specs, roadmaps)
- **GitHub Actions:** May not be active yet (fewer workflows)
- **Focus:** Document quality and completeness
- **Progress:** Track in `.project-workflow.json` planning checklist

**Weekly practices:**
- **Skip:** Sprint planning/review (not in development yet)
- **Focus:** Weekly progress on planning deliverables

### Foundation Phase Adjustments

**Daily practices:**
- **Commits:** Frequent (infrastructure setup, many changes)
- **GitHub Actions:** Active, expect some failures during setup
- **Focus:** Getting to "green" status
- **Progress:** Track in `.project-workflow.json` foundation checklist

**Weekly practices:**
- **Skip:** Sprint planning (not iterating yet)
- **Focus:** Weekly milestones (DB setup, auth complete, etc.)

### Development Phase Adjustments

**Daily practices:**
- **Standard:** All daily practices apply
- **Commits:** Multiple per day (feature development)
- **GitHub Actions:** Must stay green
- **Progress:** Track in sprint plans + workflow checklist

**Weekly practices:**
- **Full sprint workflow:** Planning, reviews, retrospectives
- **Focus:** Velocity and feature completion

### Testing Phase Adjustments

**Daily practices:**
- **Commits:** Test additions, bug fixes, optimizations
- **GitHub Actions:** Must stay green (critical in testing)
- **Focus:** Test coverage and quality metrics
- **Progress:** Track in `.project-workflow.json` testing checklist

**Weekly practices:**
- **Modified sprints:** Focus on quality gates, not new features
- **Focus:** Metrics trending toward targets

### Launch Phase Adjustments

**Daily practices:**
- **Commits:** Infrastructure, documentation, runbooks
- **GitHub Actions:** Must be rock solid green
- **Focus:** Production readiness
- **Progress:** Track in `.project-workflow.json` launch checklist

**Weekly practices:**
- **Skip:** Feature sprints
- **Focus:** Launch checklist completion, deployment testing

---

## 🔗 GitHub Health Integration

### Zero-Tolerance Policy

**From GitHub Health Monitoring system:**
- ❌ **NEVER** ignore failing GitHub Actions
- ❌ **NEVER** push code while workflows failing
- ❌ **NEVER** let warnings accumulate
- ✅ **ALWAYS** fix errors before next commit
- ✅ **ALWAYS** investigate warnings same day

**Integration with daily practices:**
- **Morning:** First thing, check GitHub health
- **During:** Fix failures immediately when they occur
- **Evening:** Verify still green before leaving

**Pre-push hook enforcement:**
- Automatically checks before every push
- Blocks push if workflows failing
- Forces adherence to zero-tolerance policy

### Daily GitHub Health Workflow

```bash
# Morning check
bash scripts/check-github-health.sh

# If failures:
gh run view --log            # View error details
# Fix the errors
gh run rerun <run-id>        # Verify fix

# End of day check
gh run list --limit 1        # Verify still green
```

**See:** `GITHUB-HEALTH-MONITORING.md` for complete system documentation

---

## 🛠️ Troubleshooting

### I Forgot to Check GitHub Health This Morning

**Solution:**
- Check now: `bash scripts/check-github-health.sh`
- If failures, fix immediately
- Set calendar reminder for tomorrow

### I Can't Keep Up with Daily Commits

**Causes:**
- Tasks too large (break into smaller tasks)
- Context switching (minimize interruptions)
- Perfectionism (commit work in progress, refine later)

**Solutions:**
- Commit incomplete work to feature branch
- Use `WIP: ` prefix for work-in-progress commits
- Squash commits later before merging

### Workflow State Gets Out of Sync

**Symptom:** `.project-workflow.json` doesn't match reality

**Solutions:**
- Set end-of-day reminder to update
- Update as you complete tasks (not batch)
- Use script to auto-detect completed tasks (future enhancement)

### I'm Behind on Weekly Practices

**Solutions:**
- Friday sprint review is non-negotiable (30 min minimum)
- Mid-week check can be shortened to 15 min
- Security checks can be automated (Dependabot, Renovate)

### GitHub Actions Constantly Failing

**Solutions:**
- Stop new work, focus on fixing
- Review test reliability
- Check for flaky tests
- May indicate infrastructure issues
- See `GITHUB-HEALTH-MONITORING.md` troubleshooting section

---

## 📊 Daily Practice Checklist

Print this or keep handy:

```
MORNING (15-30 min)
[ ] Run bash scripts/check-github-health.sh
[ ] Fix any failures immediately
[ ] Review yesterday's commits (git log)
[ ] Check PRs and notifications
[ ] Open .project-workflow.json
[ ] Select 1-3 tasks for today
[ ] Document today's plan

DURING WORK
[ ] Commit code frequently (2-5 commits)
[ ] Use conventional commit messages
[ ] Update .project-workflow.json progress
[ ] Document architecture decisions (ADRs)
[ ] Fix errors immediately (zero tolerance)

END OF DAY (15-30 min)
[ ] Push all code (git push)
[ ] Update .project-workflow.json
[ ] Verify GitHub Actions green
[ ] Document any blockers
[ ] Plan tomorrow's tasks (3-5 max)
```

---

## 📚 Additional Resources

**Workflow:**
- `PROJECT-WORKFLOW.md` - Complete lifecycle guide
- `.project-workflow.json` - Interactive task checklist
- `.project-state.json` - Project state tracking

**GitHub Health:**
- `scripts/check-github-health.sh` - Health check script
- `GITHUB-HEALTH-MONITORING.md` - Complete monitoring system
- `.githooks/pre-push` - Pre-push hook enforcement

**Templates:**
- `sprints/sprint-plan-template.md` - Sprint planning
- `sprints/retrospective-template.md` - Retrospectives
- `technical/adr-template.md` - Architecture decisions
- `workflows/runbook-template.md` - Deployment runbooks

**Documentation:**
- `DOCUMENTATION-AUTOMATION.md` - Auto-documentation system
- `generate_session_doc.py` - Session documentation
- `generate_changelog.py` - Changelog generation

---

**Last Updated:** 2025-11-09
**Version:** 2.1
**Maintained By:** Template System

---

*Consistency in daily practices leads to project success. Stay disciplined!* 🚀

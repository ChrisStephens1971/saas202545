# Workflow Strict Mode Documentation

**Version:** 1.0
**Created:** 2025-11-09
**Purpose:** Enforce workflow discipline through mandatory phase transitions and daily practices

---

## Table of Contents

1. [Overview](#overview)
2. [Why Strict Mode?](#why-strict-mode)
3. [How It Works](#how-it-works)
4. [Checking Status](#checking-status)
5. [Validation Systems](#validation-systems)
6. [Override Mechanisms](#override-mechanisms)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**Strict Mode** is a workflow enforcement system that makes phase transitions and daily practices **MANDATORY by default**.

### Key Features

- **Phase Transition Validation**: Blocks moving to next phase until criteria met
- **Daily Practices Enforcement**: Requires GitHub health checks, commits, and workflow updates
- **Git Hook Integration**: Pre-commit hooks validate before allowing commits
- **Override System**: Allows temporary overrides with documented reasons
- **Easy Toggle**: Simple script to enable/disable strict mode

### Default Behavior

**Strict mode is ENABLED by default** in all projects created from v2.1 templates.

This means:
- ✅ Phase transitions require validation
- ✅ Daily practices are checked before commits
- ✅ Git hooks block invalid operations
- ✅ AI assistants enforce workflow rules

---

## Why Strict Mode?

### The Problem

Without strict enforcement, projects tend to:
- Skip quality gates when "in a hurry"
- Accumulate technical debt
- Let GitHub Actions failures persist
- Defer documentation and testing
- Launch with unresolved issues

### The Solution

Strict mode ensures:
- 🎯 **Quality gates are met** before advancing phases
- 🎯 **GitHub Actions stay green** through daily health checks
- 🎯 **Documentation stays current** through automated practices
- 🎯 **Testing coverage grows** incrementally with development
- 🎯 **Technical debt is minimized** through proactive enforcement

### When to Use Strict Mode

**Always use strict mode (default) when:**
- Starting new projects
- Working on production codebases
- Working in teams
- Building enterprise applications
- Maintaining quality standards

**Consider disabling temporarily when:**
- Rapid prototyping (MVP experiments)
- Emergency production fixes
- Demo preparation with tight deadlines
- Exploring technical approaches

---

## How It Works

### Configuration File

`.workflow-config.json` controls strict mode behavior:

```json
{
  "version": "1.0",
  "strictMode": true,           // Master toggle
  "enforcePhaseTransitions": true,
  "enforceDailyPractices": true,
  "allowOverrides": true,
  "requireOverrideReasons": true,
  "requirements": {
    "minimumTestCoverage": 60,
    "githubActionsRequirement": "green",
    "dailyCommitRequirement": false,
    "dailyHealthCheckRequirement": true,
    "blockPhaseSkipping": true
  },
  "overrides": {
    "logOverrides": true,
    "overrideLogFile": ".workflow-overrides.json",
    "requireApproval": false
  },
  "notifications": {
    "remindDailyPractices": true,
    "warnOnSkippedPractices": true,
    "blockOnMissedPractices": true
  }
}
```

### Phase Transition Rules

`.project-workflow.json` defines transition criteria:

```json
{
  "phaseTransitions": {
    "foundation_to_development": {
      "criteria": [
        "Project scaffolded",
        "Database connected",
        "Authentication working",
        "GitHub Actions green",
        "Tests passing"
      ],
      "mandatory": true,        // ← Enforced in strict mode
      "allowOverride": true,    // ← User can override with reason
      "requireReason": true     // ← Must document why overriding
    }
  }
}
```

### Validation Scripts

Three scripts enforce strict mode:

1. **`scripts/validate-phase-transition.sh`**
   - Checks if phase transition criteria met
   - Called by AI assistant before allowing phase change
   - Exits 1 if validation fails

2. **`scripts/validate-daily-practices.sh`**
   - Checks if GitHub health check ran today
   - Checks if workflow state updated
   - Called by git pre-commit hook

3. **`scripts/toggle-workflow-strict.sh`**
   - Easy interface to enable/disable strict mode
   - Shows current status
   - Updates `.workflow-config.json`

### Git Hook Integration

`.githooks/pre-commit` runs validation before commits:

```bash
# Validate daily practices (strict mode)
if [ -f "scripts/validate-daily-practices.sh" ]; then
    echo "  Checking daily practices..."
    if bash scripts/validate-daily-practices.sh 2>&1; then
        echo "  ✅ Daily practices validated"
    else
        echo ""
        echo "To bypass daily practices check (not recommended):"
        echo "  git commit --no-verify"
        exit 1
    fi
fi
```

---

## Checking Status

### Quick Status Check

```bash
# Show current strict mode configuration
bash scripts/toggle-workflow-strict.sh status
```

Output:
```
=== Workflow Strict Mode Status ===

Strict Mode: true
Enforce Phase Transitions: true
Enforce Daily Practices: true

Status: STRICT (workflow rules enforced)

What's enforced:
  - Phase transitions must meet criteria
  - Daily practices required (GitHub health check)
  - Git hooks validate before commit/push

To disable: ./scripts/toggle-workflow-strict.sh disable
```

### Check Configuration

```bash
# View full configuration
cat .workflow-config.json | python3 -m json.tool
```

### Check Current Phase

```bash
# View current phase and progress
cat .project-state.json | python3 -m json.tool | grep -A 5 workflow
```

### Check Phase Transition Criteria

```bash
# View criteria for specific transition
cat .project-workflow.json | python3 -m json.tool | grep -A 20 foundation_to_development
```

---

## Validation Systems

### Phase Transition Validation

**Triggered when:** User requests to move to next phase

**Validation process:**

1. AI assistant detects phase change request
2. Reads `.workflow-config.json` → checks if `strictMode: true`
3. Reads `.project-workflow.json` → checks if transition `mandatory: true`
4. Runs: `bash scripts/validate-phase-transition.sh <current> <next>`
5. Script checks criteria for that specific transition
6. If fails → Blocks transition and shows missing criteria
7. If passes → Allows transition to proceed

**Example interaction:**

```
User: "I'm ready to move to Development phase"

AI: Validating Foundation → Development transition...

Running: bash scripts/validate-phase-transition.sh foundation development

Checking Foundation → Development criteria:
  ✅ Project scaffolded
  ✅ Database schema created
  ✅ Authentication working
  ❌ GitHub Actions green (2 workflows failing)
  ❌ Tests passing (no tests found)

❌ Cannot transition: 2 criteria not met

Required actions:
1. Fix GitHub Actions failures
   Run: bash scripts/check-github-health.sh

2. Write and pass initial tests
   Create tests in tests/ or __tests__/

To override (not recommended):
  "override phase transition with reason: [your reason]"

Shall I help you fix the GitHub Actions failures?
```

### Daily Practices Validation

**Triggered when:** Attempting to commit code

**Validation process:**

1. User runs: `git commit -m "message"`
2. Pre-commit hook executes
3. Hook runs: `bash scripts/validate-daily-practices.sh`
4. Script checks:
   - GitHub health check ran today
   - Commit made today
   - Workflow state updated
5. If fails → Blocks commit with instructions
6. If passes → Allows commit to proceed

**Example output:**

```
$ git commit -m "Add new feature"

🔍 Running pre-commit validation...
  Checking for unreplaced placeholders...
  Checking for secrets in .env.local...
  Checking daily practices...

=== Validating Daily Practices ===
GitHub health check (today): ❌ (last check: 2025-11-08)
  Run: bash scripts/check-github-health.sh

❌ Daily practices not completed

To bypass (not recommended):
  git commit --no-verify

[Commit blocked]
```

### Criteria Checked by Transition

**Planning → Foundation:**
- Recommended but not mandatory
- Roadmap complete
- Architecture decided
- Sprint 1 plan ready

**Foundation → Development:**
- **MANDATORY** (blocks if not met)
- Project scaffolded
- Database connected
- Authentication working
- GitHub Actions green
- Tests passing

**Development → Testing:**
- **MANDATORY** (blocks if not met)
- Core features complete
- Test coverage >= 60%
- GitHub Actions green for 3 days
- No known critical bugs

**Testing → Launch:**
- **MANDATORY** (blocks if not met)
- Test coverage >= 80%
- Performance targets met
- Security audit passed
- Critical bugs fixed

**Launch → Production:**
- **MANDATORY** (blocks if not met)
- Production environment ready
- Monitoring active
- Deployment runbook complete
- Go-live checklist complete

---

## Override Mechanisms

### Option 1: Temporary Override with Reason

**Use when:** You need to bypass validation but want to maintain strict mode for future checks

```
User: "override phase transition with reason: client demo tomorrow, need to show progress"

AI: Override recorded.

⚠️  Warning: Transitioning without meeting criteria may lead to:
  - Technical debt accumulation
  - Quality issues in production
  - Harder to fix problems later

Proceeding with transition to Development phase...

Override logged to .workflow-overrides.json:
  - timestamp: 2025-11-09T14:30:00Z
  - transition: foundation_to_development
  - reason: client demo tomorrow, need to show progress
  - user: chris.stephens

Recommendation: Address missing criteria ASAP:
  1. Fix GitHub Actions (2 workflows failing)
  2. Add initial tests

What would you like to work on first?
```

**Override log format** (`.workflow-overrides.json`):

```json
{
  "overrides": [
    {
      "timestamp": "2025-11-09T14:30:00Z",
      "type": "phase_transition",
      "from_phase": "foundation",
      "to_phase": "development",
      "reason": "client demo tomorrow, need to show progress",
      "user": "chris.stephens",
      "missing_criteria": [
        "GitHub Actions green",
        "Tests passing"
      ]
    }
  ]
}
```

### Option 2: Disable Strict Mode Temporarily

**Use when:** You need flexibility for extended period (rapid prototyping, emergency fixes)

```bash
# Disable strict mode
bash scripts/toggle-workflow-strict.sh disable
```

Output:
```
✅ Strict mode DISABLED

Workflow rules now optional:
  - Phase transitions allowed without validation
  - Daily practices not enforced
  - Git hooks don't block

⚠️  WARNING: Disabling strict mode may lead to:
  - Skipped quality gates
  - Technical debt accumulation
  - Reduced project discipline

Re-enable when ready: ./scripts/toggle-workflow-strict.sh enable
```

**Re-enable when done:**

```bash
# Re-enable strict mode
bash scripts/toggle-workflow-strict.sh enable
```

Output:
```
✅ Strict mode ENABLED

Workflow rules now enforced:
  - Phase transitions validated
  - Daily practices required
  - Git hooks block invalid operations

View status: ./scripts/toggle-workflow-strict.sh status
```

### Option 3: Bypass Git Hooks (EMERGENCY ONLY)

**Use when:** Absolute emergency, no other option

```bash
# Bypass pre-commit hook (DANGEROUS)
git commit --no-verify -m "Emergency fix"

# Bypass pre-push hook (DANGEROUS)
git push --no-verify
```

**⚠️ WARNING:** This bypasses ALL validation:
- Daily practice checks
- GitHub Actions validation
- Placeholder checks
- Secrets detection

**Only use in true emergencies.** Better approach:
1. Run health check: `bash scripts/check-github-health.sh`
2. Fix issues found
3. Commit normally (hooks will pass)

---

## Best Practices

### For Developers

1. **Start each day with health check**
   ```bash
   bash scripts/check-github-health.sh
   ```

2. **Fix issues immediately**
   - Don't let GitHub Actions failures persist
   - Don't accumulate warnings
   - Don't defer quality work

3. **Update workflow state daily**
   ```bash
   # Mark tasks as completed when done
   # Update .project-workflow.json
   ```

4. **Use overrides sparingly**
   - Document clear reason when overriding
   - Address missing criteria ASAP after override
   - Review override log weekly

5. **Re-enable strict mode quickly**
   - If disabled for emergency, re-enable same day
   - Don't leave projects in flexible mode indefinitely

### For Teams

1. **Review override log weekly**
   ```bash
   cat .workflow-overrides.json | python3 -m json.tool
   ```

2. **Set team expectations**
   - Strict mode is default
   - Overrides require reason
   - GitHub must stay green

3. **Discuss overrides in standups**
   - Why was override needed?
   - When will criteria be met?
   - How to avoid future overrides?

4. **Track metrics**
   - Frequency of overrides
   - Time in each phase
   - GitHub Actions health

### For AI Assistants

1. **Always check status at session start**
   ```bash
   cat .workflow-config.json | python3 -m json.tool
   ```

2. **Validate before phase transitions**
   - Don't silently bypass strict mode
   - Show validation output to user
   - Explain why blocked

3. **Remind about daily practices**
   - Proactively check if health check ran
   - Suggest running if not done
   - Explain benefits

4. **Explain override consequences**
   - Warn about technical debt
   - Suggest completing criteria instead
   - Document override properly if user insists

5. **Encourage strict mode**
   - Recommend re-enabling if disabled
   - Explain benefits of enforcement
   - Show project quality improvements

---

## Troubleshooting

### Commits Keep Getting Blocked

**Symptom:** Pre-commit hook blocks every commit

**Diagnosis:**
```bash
# Check what's failing
bash scripts/validate-daily-practices.sh

# Check GitHub Actions
bash scripts/check-github-health.sh
```

**Solutions:**
1. Fix GitHub Actions failures first
2. Run health check if not done today
3. Update workflow state
4. Temporarily disable strict mode if emergency:
   ```bash
   bash scripts/toggle-workflow-strict.sh disable
   ```

### Phase Transition Always Fails

**Symptom:** Can't move to next phase despite completing work

**Diagnosis:**
```bash
# Check transition criteria
bash scripts/validate-phase-transition.sh <current> <next>

# Check workflow config
cat .workflow-config.json | python3 -m json.tool
```

**Solutions:**
1. Review validation output - what's missing?
2. Complete missing criteria
3. Override with reason if criteria don't apply:
   ```
   "override phase transition with reason: [specific reason]"
   ```
4. Adjust criteria if unrealistic (edit `.project-workflow.json`)

### Validation Scripts Not Found

**Symptom:** `bash: scripts/validate-daily-practices.sh: No such file or directory`

**Diagnosis:**
```bash
# Check if scripts exist
ls -la scripts/validate-*.sh
```

**Solutions:**
1. Copy scripts from template:
   ```bash
   cp /c/devop/.template-system/templates/saas-project/scripts/validate-*.sh scripts/
   chmod +x scripts/validate-*.sh
   ```

2. Or run deployment script:
   ```bash
   bash /c/devop/.template-system/scripts/deploy-strict-mode.sh
   ```

### Strict Mode Won't Disable

**Symptom:** `toggle-workflow-strict.sh disable` doesn't work

**Diagnosis:**
```bash
# Check if script exists and is executable
ls -la scripts/toggle-workflow-strict.sh

# Check current config
cat .workflow-config.json
```

**Solutions:**
1. Make script executable:
   ```bash
   chmod +x scripts/toggle-workflow-strict.sh
   ```

2. Manually edit config:
   ```bash
   # Edit .workflow-config.json
   # Change "strictMode": true → "strictMode": false
   ```

3. Copy script from template:
   ```bash
   cp /c/devop/.template-system/templates/saas-project/scripts/toggle-workflow-strict.sh scripts/
   chmod +x scripts/toggle-workflow-strict.sh
   ```

### Override Log Growing Too Large

**Symptom:** `.workflow-overrides.json` has hundreds of entries

**Diagnosis:**
```bash
# Count overrides
cat .workflow-overrides.json | python3 -c "import json, sys; print(len(json.load(sys.stdin)['overrides']))"
```

**Solutions:**
1. **Review overrides** - why so many?
2. **Adjust criteria** - are they too strict for your context?
3. **Archive old overrides:**
   ```bash
   mv .workflow-overrides.json .workflow-overrides-$(date +%Y%m%d).json
   echo '{"overrides": []}' > .workflow-overrides.json
   ```
4. **Consider flexible mode** - if constantly overriding, maybe strict mode isn't right for this project

### Git Hooks Not Running

**Symptom:** Commits succeed without validation

**Diagnosis:**
```bash
# Check if hooks are enabled
git config core.hooksPath

# Check if pre-commit exists
ls -la .githooks/pre-commit
```

**Solutions:**
1. Enable git hooks:
   ```bash
   git config core.hooksPath .githooks
   ```

2. Make hook executable:
   ```bash
   chmod +x .githooks/pre-commit
   ```

3. Copy hook from template:
   ```bash
   cp /c/devop/.template-system/templates/saas-project/.githooks/pre-commit .githooks/
   chmod +x .githooks/pre-commit
   ```

---

## Related Documentation

- **PROJECT-WORKFLOW.md** - Complete lifecycle workflow guide
- **workflows/DAILY-PRACTICES.md** - Daily and weekly practice details
- **GITHUB-HEALTH-MONITORING.md** - GitHub Actions health monitoring
- **WORKFLOW-V21-DEPLOYMENT.md** - Workflow v2.1 deployment log

---

## Changelog

### Version 1.0 (2025-11-09)
- Initial documentation
- Strict mode enforcement system
- Phase transition validation
- Daily practices validation
- Override mechanisms
- Git hook integration

---

**Questions or Issues?**

1. Check `.workflow-config.json` for current settings
2. Run `bash scripts/toggle-workflow-strict.sh status`
3. Review override log: `cat .workflow-overrides.json`
4. Consult troubleshooting section above
5. Review PROJECT-WORKFLOW.md for workflow details

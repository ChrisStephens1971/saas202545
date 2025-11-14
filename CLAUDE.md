# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Elder-First Church Platform** - A multi-tenant church management platform for small churches (sub-200 members).

**Project Code:** saas202545
**Created:** 2025-11-14
**Platform:** Microsoft Azure
**Current Phase:** Planning (see `.project-state.json`)

### Application Stack

- **Frontend:** Next.js 14 PWA with React Native wrapper (future)
- **Backend:** Node/TypeScript with tRPC + REST for public endpoints
- **Database:** Azure Database for PostgreSQL Flexible Server
- **Files:** Azure Blob + CDN
- **Jobs:** Azure Functions (Timers/Queues)
- **Realtime:** Azure Web PubSub (optional for V1)
- **Auth:** Entra External ID (B2C) with roles: Admin, Editor, Submitter, Viewer, Kiosk

### Core Features (V1 Scope)

1. **Messaging** - Communication for members
2. **Events/RSVP** - Event management with RSVP tracking
3. **People/Groups** - Member and group management
4. **Giving** - Basic contribution tracking
5. **Bulletin Generator** - Weekly bulletin creation (PDF, Slides, Web/Email)

---

## Quick Reference

### Current Project Status

Check project phase: `cat .project-state.json | jq '.workflow.currentPhase'`

**Current Phase:** Planning
**Next Steps:** Move to Foundation phase when planning artifacts complete

### Key Files & Directories

- `prompts/claude/claude_runbook.yaml` - Task definitions and execution order
- `artifacts/` - All task outputs (specs, schemas, code)
- `.project-state.json` - Current phase and metadata
- `.project-workflow.json` - Checklist and progress tracking
- `infrastructure/` - Azure IaC (Bicep/Terraform)
- `docs/` - Product specifications

### Common Commands (Once App Exists)

```bash
# Check GitHub Actions
gh run list --limit 5

# View project status
cat .project-state.json

# View pending tasks
cat .project-workflow.json | jq '.phases[.currentPhase].checklist'
```

---

## Task Execution System

This project uses a structured task execution system based on `prompts/claude/claude_runbook.yaml`.

### Task Workflow

1. **Read the runbook:** Tasks are defined in `prompts/claude/claude_runbook.yaml` with:
   - Dependencies (`depends_on`)
   - Artifacts to produce (saved to `/artifacts`)
   - Acceptance criteria
   - Detailed prompts

2. **Execute tasks in order:** Follow dependency chain (e.g., P1 → P3 → P5 → P6 → P8 → P9 → P10 → P11 → P18 for V1)

3. **Save artifacts:** All outputs MUST be saved to `/artifacts` using exact filenames from runbook

4. **Validate:** Check acceptance criteria after each task before proceeding

### Key Tasks Completed

- ✅ **P1:** Product V1 Contract (`P1_v1_contract.md`)
- ✅ **P2:** System Architecture (`P2_architecture.md`)
- ✅ **P3:** Database Schema (`P3_schema.sql`)
- ✅ **P4:** Auth & Roles (`P4_roles.md`, `P4_middleware.ts`)
- ✅ **P5:** API Surface (`P5_api.md`, `P5_routers.ts`)
- ✅ **P6:** Admin UI Wireframes (`P6_wireframes.md`)
- ✅ **P8:** Bulletin Issues (`P8_bulletin_issues.md`)
- ✅ **P9:** Design Tokens & Templates (`P9_tokens.css`, `P9_templates.md`)
- ✅ **P10:** Bulletin Renderer (`P10_renderer.ts`)
- ✅ **P11:** Locking & Audit (`P11_locking.ts`, `P11_audit.sql`)
- ✅ **P16:** Infrastructure (`P16_infra.bicep`, `P16_pipelines.yml`)
- ✅ **P18:** End-to-End Tests (`P18_playwright.spec.ts`)

### Database Schema

PostgreSQL with Row-Level Security (RLS). Main tables:
- `Person`, `Household`, `Group` - People management
- `Event`, `RSVP` - Events and responses
- `Announcement`, `ServiceItem` - Content for bulletins
- `BrandPack`, `BulletinIssue` - Bulletin generation
- `Contribution`, `Fund` - Giving tracking
- `Attachment`, `RoleAssignment`, `AuditLog` - Supporting tables

All tables include `tenant_id` with RLS policies enforcing tenant isolation.

Schema: `artifacts/P3_schema.sql`

### API Structure

tRPC-based API with routers:
- `people` - Search, get, upsert persons
- `events` - List, create, update, RSVP management
- `announcements` - List active, create, approve
- `services` - List by date, upsert items, enforce CCLI
- `brandpack` - Get active, set for week
- `bulletin` - Create issue, build preview, lock, reopen, generate artifacts
- `giving` - Create contribution, list funds, export statements
- `import` - ICS upload, Planning Center CSV

Details: `artifacts/P5_api.md`, `artifacts/P5_routers.ts`

### Bulletin Generator System

The bulletin generator is the flagship feature. Key constraints:

**Content Constraints:**
- Announcement title: ≤60 characters
- Announcement body: ≤300 characters
- ServiceItem requires CCLI# for songs before lock
- Weekly lock enforced (Thursday 2pm default)

**Workflow States:**
1. **Draft** - Intake form open, edits allowed
2. **Built** - Preview generated, can still edit
3. **Locked** - No edits, timestamp on emergency reopen

**Output Formats:**
- PDF bulletin (print-ready)
- Slide loop (ProPresenter-compatible)
- Web/Email version

**Implementation:**
- Renderer: `artifacts/P10_renderer.ts`
- Locking logic: `artifacts/P11_locking.ts`
- Templates: `artifacts/P9_templates.md`
- Design tokens: `artifacts/P9_tokens.css`

---

## ⚙️ Available Tools: Built-in vs. Installable

**IMPORTANT:** Understand what's available without installation!

### ✅ Built-in Tools (Always Available - No Installation)

These are **ALWAYS** available in every Claude Code session:

**Core Operations:**
- Read, Write, Edit - File operations
- Glob, Grep - Search and find files
- Bash - Execute commands
- WebSearch, WebFetch - Research capabilities

**Specialized Task Agents (Built-in!):**
- **Task tool with subagent_type** - Launches specialized agents
  - `Explore` - Fast codebase exploration
  - `Plan` - Fast planning and analysis
  - `general-purpose` - Multi-step complex tasks

**⚠️ CRITICAL:** Task tool's Explore/Plan agents are **BUILT-IN**. They do NOT require installation!

### 📦 Optional Extensions (Require Installation)

Install these **ONLY when needed**:

**Claude Skills** - Document processing
- xlsx, docx, pdf, skill-creator
- Install: `/plugin add xlsx`

**WSHobson Agents** - Framework specialists
- python-development, react-typescript, full-stack-orchestration
- Install: `/plugin install full-stack-orchestration`

**Claude Code Templates** - Role-based workflows
- frontend-developer, backend-architect, test-engineer
- Install: `npx claude-code-templates@latest --agent [name]`

**See:** `BUILT-IN-VS-INSTALLABLE.md` for complete breakdown

**When to install extensions?** Only during development phase, NOT for planning!

---

## 🎯 Project Overview

This is an **Azure-specific SaaS project** using the Verdaio Azure naming standard v1.2.

**Azure Configuration:**
- **Organization:** vrd
- **Project Code:** 202545
- **Primary Region:** eus2
- **Secondary Region:** 
- **Multi-Tenant:** true
- **Tenant Model:** subdomain

---

## 📋 Azure Naming Standard

This project follows the **Verdaio Azure Naming & Tagging Standard v1.2** with projectID-based codes.

**Pattern:** `{type}-{org}-{proj}-{env}-{region}-{slice}-{seq}`

**Example Resources:**
```
# Resource Groups
rg-vrd-202545-prd-eus2-app
rg-vrd-202545-prd-eus2-data

# App Services
app-vrd-202545-prd-eus2-01
func-vrd-202545-prd-eus2-01

# Data Services
sqlsvr-vrd-202545-prd-eus2
cosmos-vrd-202545-prd-eus2
redis-vrd-202545-prd-eus2-01

# Storage & Secrets
stvrd202545prdeus201
kv-vrd-202545-prd-eus2-01
```

**Full Documentation:** See `technical/azure-naming-standard.md`

---

## 🔧 Azure Automation Scripts

Located in `C:\devop\.template-system\scripts\`:

### Generate Resource Names
```bash
python C:/devop/.template-system/scripts/azure-name-generator.py \
  --type app \
  --org vrd \
  --proj 202545 \
  --env prd \
  --region eus2 \
  --seq 01
```

### Validate Resource Names
```bash
python C:/devop/.template-system/scripts/azure-name-validator.py \
  --name "app-vrd-202545-prd-eus2-01"
```

### Generate Tags
```bash
python C:/devop/.template-system/scripts/azure-tag-generator.py \
  --org vrd \
  --proj 202545 \
  --env prd \
  --region eus2 \
  --owner ops@verdaio.com \
  --cost-center 202545-llc \
  --format terraform
```

---

## 🔒 Azure Security Baseline

This project includes the **Azure Security Playbook v2.0** - a comprehensive zero-to-production security implementation.

### Security Resources

**📘 Core Documentation:**
- `technical/azure-security-zero-to-prod-v2.md` - Complete security playbook (Days 0-9)
- `azure-security-baseline-checklist.csv` - 151-task tracking checklist

**🚨 Incident Response Runbooks:**
- `azure-security-runbooks/` - 5 detailed incident response procedures
  - credential-leak-response.md (MTTR: 15 min)
  - exposed-storage-response.md (MTTR: 30 min)
  - suspicious-consent-response.md (MTTR: 20 min)
  - ransomware-response.md (MTTR: Immediate)
  - privilege-escalation-response.md (MTTR: 30 min)

**🏗️ Security Baseline IaC:**
- `infrastructure/azure-security-bicep/` - Production-ready Bicep modules (Recommended)
  - Management groups, hub network, spoke network, policies, Defender, logging
  - Deploy complete baseline: `az deployment sub create --template-file azure-security-bicep/main.bicep`
- `infrastructure/azure-security-terraform/` - Terraform reference modules

### Quick Start: Deploy Security Baseline

```bash
# Deploy complete security infrastructure (30-45 min)
cd infrastructure/azure-security-bicep

az deployment sub create \
  --location eastus2 \
  --template-file main.bicep \
  --parameters \
    org=vrd \
    proj=202545 \
    env=prd \
    primaryRegion=eus2 \
    enableDDoS=true \
    firewallSku=Premium
```

**What gets deployed:**
- ✅ Hub network (Firewall Premium + DDoS + Bastion)
- ✅ Spoke network with NSGs and private subnets
- ✅ Log Analytics + Azure Sentinel
- ✅ Microsoft Defender for Cloud (all plans)
- ✅ Azure Policies for governance
- ✅ Private DNS zones for Private Link

**Cost:** ~$5,000-6,000/month (production) | ~$1,000-1,500/month (dev/test)

---

## Development Commands

### Application Development

Once the application is scaffolded, typical commands will be:

```bash
# Frontend (Next.js)
npm install          # Install dependencies
npm run dev          # Start dev server (port 3045)
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation

# Backend (Node/TypeScript with tRPC)
npm install          # Install dependencies
npm run dev          # Start dev server (port 8045)
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run test:watch   # Watch mode

# Database
# PostgreSQL connection details in .env.local
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open DB UI (Prisma Studio or similar)
```

### Testing

```bash
# Unit tests
npm test                    # Run all tests
npm test -- <file>          # Run specific test file
npm test -- --coverage      # Coverage report

# E2E tests (Playwright)
npx playwright test                           # Run all E2E tests
npx playwright test --ui                      # Interactive UI mode
npx playwright test bulletin-generator.spec   # Specific test
```

See: `artifacts/P18_playwright.spec.ts` for E2E test structure

---

## 🏗️ Infrastructure as Code

This project uses **Bicep** for Azure infrastructure (Terraform available as alternative).

### Bicep Deployment

Located in `infrastructure/bicep/` and `artifacts/P16_infra.bicep`:

```bash
# Deploy to Azure
az deployment group create \
  --resource-group rg-vrd-202545-dev-eus2-app \
  --template-file artifacts/P16_infra.bicep \
  --parameters env=dev org=vrd proj=202545
```

**Infrastructure includes:**
- Azure Database for PostgreSQL Flexible Server
- App Service for Next.js frontend
- Azure Functions for background jobs
- Azure Blob Storage + CDN for files
- Azure Key Vault for secrets
- Azure Web PubSub (optional)

### CI/CD Pipelines

GitHub Actions workflows defined in `artifacts/P16_pipelines.yml`:

- **Build & Test** - Run on every PR
- **Deploy Dev** - Auto-deploy to dev on main branch
- **Deploy Staging** - Manual approval
- **Deploy Production** - Manual approval + smoke tests

**Note:** Workflows should be created in `.github/workflows/` directory once application is scaffolded.

---

## ⚡ CRITICAL: GitHub Health Monitoring

**MANDATORY PRACTICE:** Fix GitHub errors and warnings **immediately**, not when they block something.

### 🎯 Zero-Tolerance Policy

- ❌ **NEVER** ignore failing GitHub Actions
- ❌ **NEVER** push code while workflows are failing  
- ❌ **NEVER** let warnings accumulate
- ✅ **ALWAYS** fix errors before next commit
- ✅ **ALWAYS** investigate warnings same day

### 🔧 How to Monitor

**Check GitHub Actions status:**
```bash
# View latest workflow runs
gh run list --limit 5

# View specific failure
gh run view --log

# Check workflow status
gh run watch
```

**Git hooks** - Pre-commit validation:
- Git hooks in `.githooks/` directory
- Enable: `git config core.hooksPath .githooks`
- Validates placeholders, secrets, commit messages

### 📋 Daily Health Check

**Every morning:**
1. Check GitHub Actions status: `gh run list --limit 5`
2. If failures found → Fix immediately
3. If warnings found → Investigate and fix
4. Check security alerts: `gh api repos/{owner}/{repo}/dependabot/alerts`

### 🚨 When Workflows Fail

**Immediate actions:**
1. **Stop new work** - Don't commit until fixed
2. **View logs:** `gh run view --log`
3. **Fix the error** - Not just the symptom
4. **Re-run to verify:** `gh run rerun <run-id>`
5. **Update if needed** - Dependencies, configs, etc.

**Common failure types:**
- Test failures → Fix tests or code
- Build errors → Fix dependencies, config
- Linting errors → Fix code style
- Type errors → Fix TypeScript types
- Security alerts → Update dependencies

### 🎯 AI Assistant Instructions

**When user commits code:**
1. **ALWAYS** check GitHub Actions status first
2. **BLOCK** if latest workflow failed
3. **REQUIRE** user to fix errors before proceeding
4. **SUGGEST** running `check-github-health.sh`

**Proactive monitoring:**
- Check workflow status at session start
- Remind user if workflows failing
- Offer to investigate and fix errors
- Don't proceed with new features if errors exist

### 🔒 Enforcement

**Git hooks enabled:**
```bash
# Enable automatic checking
git config core.hooksPath .githooks

# Hooks will:
# - Block commits if placeholders exist
# - Block pushes if workflows failing
# - Validate commit messages
# - Check for secrets
```

**To bypass (EMERGENCY ONLY):**
```bash
# NOT RECOMMENDED - Only for emergency fixes
git push --no-verify
```

---


## 🔄 Project Lifecycle Workflow (v2.1)

**NEW in v2.1:** Comprehensive workflow system for project lifecycle management.

### Quick Start

**Check current workflow status:**
```bash
# View current phase
cat .project-state.json | jq '.workflow.currentPhase'

# View current tasks
cat .project-workflow.json | jq '.phases[.currentPhase].checklist'

# View completion percentage
cat .project-workflow.json | jq '.phases[.currentPhase].completionPercent'
```

**Daily workflow:**
1. **Morning:** Check project status and GitHub Actions
2. **Work:** Complete tasks from current phase checklist
3. **Evening:** Update `.project-workflow.json` with progress
4. **Always:** Fix GitHub Actions failures immediately

**Full guides:**
- `PROJECT-WORKFLOW.md` - Complete lifecycle workflow
- `workflows/DAILY-PRACTICES.md` - Daily and weekly practices

### Five Project Phases

1. **Planning (1-2 weeks):** Discovery, roadmap, architecture
2. **Foundation (1-2 weeks):** Setup, database, auth, CI/CD
3. **Development (4-8 weeks):** Sprint-based feature development
4. **Testing & Polish (2-3 weeks):** QA, performance, security
5. **Launch Preparation (1-2 weeks):** Deployment, monitoring, go-live

### Virtual Agent: Workflow Manager

**Trigger:** Session start, "what's next", "check progress", "update workflow"

**Behavior:**
1. Read `.project-state.json` → get current phase
2. Read `.project-workflow.json` → get current checklist
3. Show current phase and pending tasks
4. Suggest next action based on workflow
5. Remind about daily practices if not done
6. Check GitHub Actions status
7. Offer to update task status when work completed

**Example interaction:**
```
User: "what's next"

Claude: I see you're in the Foundation phase (65% complete).

Current tasks:
  ✅ Initialize project structure
  ✅ Set up database schema
  ✅ Implement authentication
  ⏳ Set up CI/CD pipeline
  ⏳ Configure testing framework

Next task: "Set up CI/CD pipeline (GitHub Actions)"
This involves creating workflow files in .github/workflows/

Also, GitHub health check hasn't run today.
Shall I check GitHub Actions status first?
```

### Phase-Specific AI Assistant Behavior

**Planning Phase:**
- Guide through discovery questions
- Help create roadmap using `product/roadmap-template.md`
- Create ADRs for architectural decisions
- Set up Sprint 1 plan
- Update `.project-workflow.json` planning checklist

**Foundation Phase:**
- Help with project scaffolding
- Guide database schema design
- Set up authentication
- Configure CI/CD pipelines
- Ensure GitHub Actions green before proceeding

**Development Phase:**
- Sprint planning assistance
- Code review & quality gates
- Test writing reminders
- GitHub Actions monitoring
- Update sprint progress in workflow

**Testing Phase:**
- Test coverage tracking
- Performance optimization suggestions
- Security checklist validation
- Bug triage and prioritization

**Launch Phase:**
- Deployment checklist verification
- Monitoring setup validation
- Documentation completion check
- Go-live preparation

### Workflow State Management

**Update workflow progress:**
```javascript
// When user completes a task
// 1. Read .project-workflow.json
// 2. Find task by id
// 3. Update: status "pending" → "completed"
// 4. Add completedDate
// 5. Recalculate completionPercent
// 6. Write back to file

// Example
const task = phases[currentPhase].checklist.find(t => t.id === 'plan-02')
task.status = 'completed'
task.completedDate = '2025-11-09'

const completed = checklist.filter(t => t.status === 'completed').length
const total = checklist.length
phases[currentPhase].completionPercent = Math.round((completed / total) * 100)
```

**Phase transitions:**
```javascript
// When all tasks in phase complete
// 1. Ask user: "Ready to move to [next phase]?"
// 2. If yes:
//    - Update currentPhase in both files
//    - Add completed phase to phasesCompleted array
//    - Set lastPhaseTransition date
//    - Show next phase tasks
// 3. Check transition criteria (recommended, not mandatory)
```

**Phase transition criteria (recommended):**
- Planning → Foundation: Roadmap complete, architecture decided
- Foundation → Development: Infrastructure green, tests passing
- Development → Testing: Core features complete, 60%+ coverage
- Testing → Launch: 80%+ coverage, performance targets met
- Launch → Production: Deployment tested, monitoring active

### Integration with Existing Systems

**GitHub Health Monitoring:**
- Daily practices include `check-github-health.sh`
- Pre-push hook enforces zero-tolerance policy
- Part of every phase's daily routine
- See `GITHUB-HEALTH-MONITORING.md`

**Sprint Planning:**
- Development phase uses sprint structure
- Templates in `sprints/` directory
- Weekly planning/review/retrospective
- Velocity tracking

**Documentation Automation:**
- ADRs for architecture decisions
- Session docs from commits
- Changelog generation
- Automated through git hooks

**Verdaio Dashboard:**
- `.project-state.json` syncs to database
- Workflow progress visible across projects
- Phase completion tracked

### Daily Practices Enforcement

**Morning:**
- Check GitHub Actions health (mandatory)
- Review yesterday's work
- Plan today's tasks (1-3 from checklist)

**During Work:**
- Commit frequently (min once/day)
- Update `.project-workflow.json` progress
- Document decisions (ADRs)
- Fix errors immediately

**End of Day:**
- Push all code
- Update workflow state
- Verify GitHub Actions green
- Plan tomorrow

**See:** `workflows/DAILY-PRACTICES.md` for complete guide

### Build Approach Adaptation

**MVP-First:**
- Planning: 3-5 days
- Foundation: 1 week
- Development: 2-4 weeks (1-2 sprints)
- Testing: 1 week (60% coverage OK)
- Launch: 3-5 days

**Complete Build:**
- Planning: 2 weeks
- Foundation: 2 weeks
- Development: 6-8 weeks (3-4 sprints)
- Testing: 3 weeks (80%+ coverage)
- Launch: 2 weeks

**Growth-Stage:**
- Continuous development/testing
- Feature-based launches
- Existing infrastructure


### Strict Mode Enforcement (Default)

**CRITICAL:** Workflow is STRICT by default. Phase transitions and daily practices are MANDATORY unless user explicitly disables.

**Check strict mode status:**
```bash
# Read .workflow-config.json
cat .workflow-config.json | jq '.strictMode, .enforcePhaseTransitions, .enforceDailyPractices'
```

**If strict mode enabled (default):**

#### Phase Transition Validation (MANDATORY)

**When user requests phase change:**
1. Read current and target phase from `.project-state.json`
2. Check `.project-workflow.json` → `phaseTransitions.<current>_to_<target>.mandatory`
3. If mandatory: true → VALIDATE CRITERIA FIRST
4. Validate criteria programmatically (check GitHub Actions, tests, etc.)
5. If validation fails → BLOCK transition
6. Show what criteria are missing
7. Require completion OR explicit override

**Example - User requests to move to Development:**
```
User: "I'm ready to move to Development phase"

Claude: Validating Foundation → Development transition...

Checking Foundation → Development criteria:
  ✅ Project scaffolded
  ✅ Database schema
  ✅ Authentication working
  ❌ GitHub Actions green (3 failing workflows)
  ❌ Tests passing (tests not found)

❌ Cannot transition: 2 criteria not met

Required actions:
1. Fix GitHub Actions failures
   View failures: gh run list --limit 5
   Check logs: gh run view --log

2. Write and pass initial tests
   Create test files in tests/ or __tests__/
   Run: npm test (or equivalent)

To override (not recommended):
  Say: "override phase transition with reason: [your reason]"

Should I help you fix the GitHub Actions failures first?
```

**If user provides override:**
```
User: "override phase transition with reason: client demo tomorrow, need to show progress"

Claude: Override recorded.

⚠️  Warning: Transitioning without meeting criteria may lead to:
  - Technical debt accumulation
  - Quality issues in production
  - Harder to fix problems later

Proceeding with transition to Development phase...

Updated .project-workflow.json:
  - currentPhase: development
  - phasesCompleted: [planning, foundation]
  - override logged with reason

Recommendation: Address missing criteria as soon as possible:
  1. Fix GitHub Actions
  2. Add tests

What would you like to work on first in Development phase?
```

#### Daily Practices Validation (MANDATORY)

**At session start (proactive):**
```
Claude: Good morning! Checking daily practices...

Checking project status:
- Current phase: foundation (65% complete)
- GitHub Actions: ❌ (3 failing workflows)
- Last commit: 2025-11-13

❌ Daily practices not completed

Before we proceed with work today, let's check GitHub Actions status.
Shall I run: gh run list --limit 5
```

**Before commit (validation):**
```
User: Tries to commit code

Pre-commit hook runs:
  🔍 Running pre-commit validation...
  Checking for unreplaced placeholders...
  Checking for secrets in .env.local...
  Checking markdown syntax...
  Checking daily practices...

❌ Daily practices not completed
  GitHub health check not run today

To bypass (not recommended):
  git commit --no-verify

Claude: I see the commit was blocked because daily practices weren't completed.
This is strict mode enforcement to ensure code quality.

Would you like me to check GitHub Actions status now?
  gh run list --limit 5
```

#### Override Process

**When user needs to override strict rules:**

**Option 1: Temporary override with reason**
```
User: "override phase transition with reason: emergency production fix needed"

Claude: 
1. Verify override is allowed: jq '.phaseTransitions.<transition>.allowOverride'
2. Check if reason required: jq '.phaseTransitions.<transition>.requireReason'
3. If reason missing → Ask for reason
4. Log override in .workflow-overrides.json (if logging enabled)
5. Proceed with transition
6. Warn about consequences
7. Remind to address criteria ASAP
```

**Option 2: Disable strict mode temporarily**
```
User: "disable strict mode"

Claude: To disable strict mode, update `.workflow-config.json`:

Set: "strictMode": false

This will:
  - Disable phase transition validation
  - Disable daily practice enforcement
  - Allow flexible workflow progression

⚠️  Warning: Disabling strict mode may lead to:
  - Skipped quality gates
  - Technical debt accumulation
  - Reduced project discipline

Re-enable by setting "strictMode": true

Should I update the config for you?
```

**Option 3: Bypass git hooks**
```
User: "how do I bypass the commit block?"

Claude: You can bypass git hooks with --no-verify:

git commit --no-verify -m "message"
git push --no-verify

⚠️  WARNING: This bypasses ALL validation:
  - Daily practice checks
  - GitHub Actions validation  
  - Placeholder checks
  - Secrets detection

Only use in emergencies. Better approach:
  1. Check GitHub Actions: gh run list --limit 5
  2. Fix any issues found
  3. Commit normally (hooks will pass)

Would you like to check GitHub Actions status instead?
```

### Flexible Mode Behavior

**If strict mode disabled (.workflow-config.json → strictMode: false):**

```
Claude: I see strict mode is disabled.

Phase transitions: Allowed without validation
Daily practices: Optional (reminders only)
Git hooks: Don't block operations

Current phase: development
Pending tasks in checklist: 3

Would you like to:
1. Work on pending tasks
2. Move to next phase (no validation required)
3. Re-enable strict mode for better discipline

What would you prefer?
```

### Best Practices for AI Assistant

**Always:**
1. Check .workflow-config.json at session start
2. Validate before phase transitions if strict mode on
3. Remind about daily practices proactively
4. Offer to run validation scripts
5. Explain why validation is blocking (teach, don't just block)
6. Provide clear paths forward (fix criteria OR override)
7. Document overrides when used
8. Encourage re-enabling strict mode if disabled

**Never:**
1. Silently bypass strict mode
2. Suggest disabling strict mode as first option
3. Let user skip validation without understanding consequences
4. Allow phase transitions without checking mandatory flag
5. Ignore daily practice requirements

---
---
## 🏷️ Required Tags

All Azure resources must have these tags:

**Core Tags (Required):**
- `Org`: vrd
- `Project`: 202545
- `Environment`: prd|stg|dev|tst|sbx
- `Region`: eus2
- `Owner`: ops@verdaio.com
- `CostCenter`: 202545-llc

**Recommended Tags:**
- `DataSensitivity`: public|internal|confidential|regulated
- `Compliance`: none|pci|hipaa|sox|gdpr
- `DRTier`: rpo15m-rto4h
- `BackupRetention`: 7d|30d|90d|1y
- `ManagedBy`: terraform|bicep|arm

**Tags are automatically applied via IaC modules.**

---

## 🔐 Azure Secrets Management

### Key Vault Naming

```
kv-vrd-202545-{env}-eus2-01
```

### Secret Naming Convention

Format: `{service}-{purpose}-{env}`

Examples:
```
sqlsvr-connection-string-prd
storage-access-key-prd
api-client-secret-prd
cosmos-primary-key-prd
```

### Accessing Secrets in IaC

**Terraform:**
```hcl
data "azurerm_key_vault_secret" "db_connection" {
  name         = "sqlsvr-connection-string-prd"
  key_vault_id = azurerm_key_vault.main.id
}
```

**Bicep:**
```bicep
resource kv 'Microsoft.KeyVault/vaults@2021-10-01' existing = {
  name: 'kv-vrd-202545-prd-eus2-01'
}

output connectionString string = kv.getSecret('sqlsvr-connection-string-prd')
```

---

## 🌍 Multi-Region Architecture

**Primary Region:** eus2
**Secondary Region:** 

### DR Strategy

**Active-Passive (Recommended):**
```
# Primary
app-vrd-202545-prd-eus2-primary-01
sqlsvr-vrd-202545-prd-eus2-primary

# Secondary (DR)
app-vrd-202545-prd--secondary-01
sqlsvr-vrd-202545-prd--secondary
```

**Active-Active (Advanced):**
```
# Region 1
app-vrd-202545-prd-eus2-01

# Region 2
app-vrd-202545-prd--01
```

### Multi-Region Tags

Add these tags to multi-region resources:
- `RegionRole`: primary|secondary|dr|active
- `PairedRegion`: 

---

## 🔍 Azure Policy Enforcement

Azure Policies are deployed via IaC to enforce naming and tagging standards.

**Policies Included:**
1. **Resource Group Naming** - Denies RGs that don't match pattern
2. **Required Tags** - Denies resources without core tags
3. **Tag Inheritance** - Auto-inherits tags from RG to resources
4. **Naming Validation** - Audits resources with non-standard names

**Policy Location:** `infrastructure/policies/`

**Deploy Policies:**
```bash
# Terraform
cd infrastructure/terraform/policies
terraform apply

# Azure CLI
cd infrastructure/policies
az policy definition create --name "rg-naming" --rules rg-naming-policy.json
az policy assignment create --policy "rg-naming" --scope /subscriptions/{sub-id}
```

---

## 📊 Cost Management

### Cost Allocation

Resources are tagged with:
- `CostCenter`: 202545-llc
- `BusinessUnit`: (optional, set per resource)
- `Application`: saas202545

### Azure Cost Analysis Queries

**Cost by Environment:**
```kusto
Resources
| where tags['Project'] == '202545'
| extend env = tostring(tags['Environment'])
| summarize cost = sum(toint(tags['monthlyCost'])) by env
```

**Cost by Resource Type:**
```kusto
Resources
| where tags['Project'] == '202545'
| summarize cost = sum(toint(tags['monthlyCost'])) by type
| order by cost desc
```

### 💰 Automatic Cost Optimization (Dev/Staging)

**Save 60-70% on dev/staging costs with automatic resource deallocation!**

The template system includes automatic Azure cost optimization scripts that deallocate VMs and scale down resources after business hours.

**Quick Setup (15 minutes):**

```bash
# 1. Install Azure SDK
pip install azure-mgmt-compute azure-mgmt-web azure-mgmt-resource azure-identity

# 2. Authenticate
az login

# 3. Create configuration
cd C:\devop\.template-system\scripts
python create-deallocation-config.py --interactive

# 4. Test (dry run)
python azure-auto-deallocate.py --dry-run --force

# 5. View cost dashboard
python azure-cost-dashboard.py

# 6. Setup automation (PowerShell as Admin)
.\Setup-AzureDeallocationSchedule.ps1
```

**Features:**
- ✅ Automatic VM deallocation after 8pm weekdays, restart at 6am
- ✅ Full weekend shutdown (Friday 8pm → Monday 6am)
- ✅ Production protection (never touches production resources)
- ✅ Safety features (exclusion tags, snapshots, resource group exclusions)
- ✅ Real-time cost dashboard with multiple views
- ✅ Email reports and logging
- ✅ Windows Task Scheduler integration

**Expected Savings:**
- ~$47/month per project (60-70% reduction on dev/staging)
- ~$235/month for 5 dev projects
- ~$2,820/year savings

**Cost Dashboard:**
```bash
# Summary view
python azure-cost-dashboard.py

# Detailed view with all resources
python azure-cost-dashboard.py --detailed

# Export to CSV
python azure-cost-dashboard.py --export costs.csv
```

**Configuration:**
The auto-deallocation system uses `azure-auto-deallocate-config.json` which specifies:
- Subscription ID
- Resource groups to manage
- Deallocation schedule
- Safety settings
- Email notifications

**See:** `C:\devop\.template-system\AZURE-AUTO-COST-OPTIMIZATION.md` for complete setup guide and troubleshooting

---

## 🧪 Testing & Validation

### Application Testing (Once App Exists)

```bash
# Unit tests
npm test                     # Run all unit tests
npm test -- --coverage       # With coverage report
npm test -- --watch          # Watch mode for development

# E2E tests (Playwright)
npx playwright test                              # All E2E tests
npx playwright test bulletin-generator.spec.ts   # Specific test suite
npx playwright test --ui                         # Interactive mode
npx playwright test --debug                      # Debug mode

# Type checking
npm run type-check           # TypeScript validation

# Linting
npm run lint                 # ESLint
npm run lint:fix             # Auto-fix issues
```

### Infrastructure Validation

Before deploying infrastructure:

```bash
# Validate Bicep
cd infrastructure/bicep
az bicep build --file main.bicep
az bicep build --file artifacts/P16_infra.bicep

# Validate naming (if using automation)
python C:/devop/.template-system/scripts/azure-name-validator.py \
  --file infrastructure/resource-inventory.json
```

After deployment:

```bash
# Verify tags
az resource list \
  --tag Project=202545 \
  --query "[].{name:name, tags:tags}" \
  -o table

# Check policy compliance
az policy state list \
  --filter "complianceState eq 'NonCompliant'" \
  -o table
```

### Database Validation

```bash
# Test RLS policies
# Connect as application user and verify tenant isolation

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Verify constraints (bulletin title/body length, CCLI requirements)
```

---

## 📚 Documentation

### Azure-Specific Docs

- `technical/azure-naming-standard.md` - Full naming standard
- `technical/azure-architecture.md` - Architecture diagrams
- `technical/azure-security.md` - Security best practices
- `infrastructure/README.md` - IaC documentation

### General Project Docs

- `product/` - Product planning
- `sprints/` - Sprint planning
- `technical/` - Technical documentation
- `business/` - Business planning

---

## 🤖 Virtual Agent: Azure Helper

**Trigger:** User mentions "azure", "deploy", "infrastructure", "terraform", "bicep"

### Common Azure Tasks

1. **"Generate Azure resource names"**
   - Use `azure-name-generator.py` script
   - Follow naming standard exactly
   - Validate with `azure-name-validator.py`

2. **"Create Terraform module"**
   - Use naming module template
   - Include common_tags locals
   - Validate names before creating resources

3. **"Deploy to Azure"**
   - Check environment (dev/stg/prd)
   - Validate naming and tagging
   - Run Terraform plan first
   - Get approval before apply

4. **"Check compliance"**
   - Run Azure Policy checks
   - Validate naming standard
   - Verify required tags present
   - Check cost allocation tags

5. **"Multi-region setup"**
   - Deploy to primary region first
   - Configure geo-replication
   - Set up Traffic Manager/Front Door
   - Add multi-region tags

---

## 🔗 Related Resources

**Azure Naming Tool:** `C:\devop\.template-system\scripts\azure-name-*.py`

**Terraform Registry:**
- [azurerm provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Naming module](https://registry.terraform.io/modules/Azure/naming/azurerm/latest)

**Microsoft Docs:**
- [Azure naming conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/naming-and-tagging)
- [Azure Policy](https://learn.microsoft.com/en-us/azure/governance/policy/)
- [Bicep documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)

---

## 🚨 Important Notes

### Application Development

1. **Follow task dependencies** - Execute runbook tasks in order (check `depends_on`)
2. **Save artifacts correctly** - All outputs go to `/artifacts` with exact filenames
3. **Validate acceptance criteria** - Check before marking tasks complete
4. **Content constraints** - Bulletin titles ≤60 chars, bodies ≤300 chars
5. **Multi-tenant isolation** - All DB queries must respect `tenant_id` RLS
6. **CCLI enforcement** - Songs require CCLI# before bulletin lock

### Infrastructure & Deployment

1. **Azure naming standard** - All resources follow `{type}-{org}-{proj}-{env}-{region}` pattern
2. **Required tags** - Org, Project, Environment, Region, Owner, CostCenter
3. **Validate before deploying** - Test Bicep/Terraform in dev first
4. **Never deploy to production directly** - Always dev → staging → production
5. **Check GitHub Actions** - Fix failures immediately, don't let them accumulate
6. **Use IaC** - Don't manually create Azure resources

### Workflow & Process

1. **Strict mode by default** - Phase transitions require criteria validation
2. **Daily practices** - Check GitHub Actions, update workflow progress
3. **Commit frequently** - Minimum once per day during active development
4. **Document decisions** - Use ADRs in `technical/decisions/`

---

**Template Version:** 1.0 (Azure)
**Last Updated:** 2025-11-14
**Project Phase:** Planning

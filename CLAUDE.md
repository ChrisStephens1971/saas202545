# CLAUDE.md - Azure SaaS Project

**Project:** saas202545
**Created:** 2025-11-14
**Template:** Azure (azure)
**Platform:** Microsoft Azure
**Path:** C:\devop\saas202545

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

## 🏗️ Infrastructure as Code

This project includes both **Terraform** and **Bicep** scaffolding.

### Terraform

Located in `infrastructure/terraform/`:

```bash
cd infrastructure/terraform

# Initialize
terraform init

# Plan
terraform plan -var-file="environments/dev.tfvars"

# Apply
terraform apply -var-file="environments/dev.tfvars"
```

**Key Files:**
- `main.tf` - Main infrastructure
- `variables.tf` - Variable definitions
- `outputs.tf` - Output values
- `modules/naming/` - Naming convention module
- `environments/*.tfvars` - Environment-specific variables

### Bicep

Located in `infrastructure/bicep/`:

```bash
cd infrastructure/bicep

# Deploy
az deployment group create \
  --resource-group rg-vrd-202545-dev-eus2-app \
  --template-file main.bicep \
  --parameters @environments/dev.parameters.json
```

**Key Files:**
- `main.bicep` - Main infrastructure
- `modules/naming.bicep` - Naming convention module
- `environments/*.parameters.json` - Environment-specific parameters

---

## 🚀 CI/CD Pipelines

### GitHub Actions

Workflows in `.github/workflows/`:

- `terraform-plan.yml` - Run Terraform plan on PR
- `terraform-apply.yml` - Apply Terraform on merge to main
- `azure-validation.yml` - Validate naming and tagging compliance
- `bicep-deploy.yml` - Deploy Bicep templates

### Azure DevOps

Pipeline templates in `infrastructure/pipelines/`:

- `azure-pipelines.yml` - Main pipeline
- `terraform-pipeline.yml` - Terraform-specific pipeline
- `bicep-pipeline.yml` - Bicep-specific pipeline

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

**Before every commit:**
```bash
# Check GitHub Actions health
bash scripts/check-github-health.sh

# View latest workflow runs
gh run list --limit 5

# View specific failure
gh run view --log
```

**Automated checking** - Pre-push hook:
- Git hook prevents pushing if latest workflow failed
- Located: `.githooks/pre-push`
- Enable: `git config core.hooksPath .githooks`

### 📋 Daily Health Check

**Every morning:**
1. Run `bash scripts/check-github-health.sh`
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
1. **Morning:** Run `bash scripts/check-github-health.sh`
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
1. Read current and target phase
2. Check `.project-workflow.json` → `phaseTransitions.<current>_to_<target>.mandatory`
3. If mandatory: true → VALIDATE CRITERIA FIRST
4. Run validation: `bash scripts/validate-phase-transition.sh <current> <target>`
5. If validation fails → BLOCK transition
6. Show what criteria are missing
7. Require completion OR explicit override

**Example - User requests to move to Development:**
```
User: "I'm ready to move to Development phase"

Claude: Validating Foundation → Development transition...

Running: bash scripts/validate-phase-transition.sh foundation development

Checking Foundation → Development criteria:
  ✅ Project scaffolded
  ✅ Database schema
  ✅ Authentication working
  ❌ GitHub Actions green (3 failing workflows)
  ❌ Tests passing (tests not found)

❌ Cannot transition: 2 criteria not met

Required actions:
1. Fix GitHub Actions failures
   Run: bash scripts/check-github-health.sh
   View failures: gh run list

2. Write and pass initial tests
   Create test files in tests/ or __tests__/
   Run: npm test (or equivalent)

To override this requirement (not recommended):
  Say: "override phase transition with reason: [your reason]"
  
Or disable strict mode:
  bash scripts/toggle-workflow-strict.sh disable

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

Running: bash scripts/validate-daily-practices.sh

=== Validating Daily Practices ===
GitHub health check (today): ❌ (last check: 2025-11-08)
  Run: bash scripts/check-github-health.sh

❌ Daily practices not completed

Before we proceed with work today, let's run the GitHub health check.
Shall I check GitHub Actions status now?
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

Would you like me to run the GitHub health check now?
  bash scripts/check-github-health.sh
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

Claude: You can disable strict mode temporarily:

bash scripts/toggle-workflow-strict.sh disable

This will:
  - Disable phase transition validation
  - Disable daily practice enforcement
  - Allow flexible workflow progression

⚠️  Warning: Disabling strict mode may lead to:
  - Skipped quality gates
  - Technical debt accumulation
  - Reduced project discipline

Re-enable when ready:
  bash scripts/toggle-workflow-strict.sh enable

Should I disable strict mode for you?
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
  1. Run: bash scripts/check-github-health.sh
  2. Fix any issues found
  3. Commit normally (hooks will pass)

Would you like to run the health check instead?
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

### Pre-Deployment Validation

Run these checks before deploying:

```bash
# 1. Validate naming
python C:/devop/.template-system/scripts/azure-name-validator.py \
  --file infrastructure/resource-inventory.json

# 2. Validate Terraform
cd infrastructure/terraform
terraform validate
terraform fmt -check

# 3. Run Checkov (security/compliance)
checkov -d infrastructure/terraform

# 4. Validate Bicep
cd infrastructure/bicep
az bicep build --file main.bicep
```

### Post-Deployment Validation

```bash
# 1. Check deployed resources match naming standard
python C:/devop/.template-system/scripts/azure-name-validator.py \
  --subscription <subscription-id>

# 2. Verify tags
az resource list \
  --tag Project=202545 \
  --query "[].{name:name, tags:tags}" \
  -o table

# 3. Check policy compliance
az policy state list \
  --filter "complianceState eq 'NonCompliant'" \
  -o table
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

1. **Never bypass naming standard** - All resources must follow the pattern
2. **Always tag resources** - Required tags must be present
3. **Validate before deploying** - Run validation scripts
4. **Document exceptions** - Use `infrastructure/EXCEPTIONS.md`
5. **Test in dev first** - Never deploy directly to production
6. **Use IaC modules** - Don't manually create resources
7. **Check costs regularly** - Review Azure Cost Management

---

**Template Version:** 1.0 (Azure)
**Last Updated:** 2025-11-14

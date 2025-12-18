# MCP Servers for Elder-First Platform

**Last Updated:** 2025-12-08

## Purpose

This document describes **MCP (Model Context Protocol) servers** used by AI coding agents (Claude Code, Gemini CLI, etc.) when working on this repository. MCP servers extend AI assistants with specialized tools for interacting with external services like GitHub, Azure, Redis, and documentation systems.

This is **developer tooling documentation**, not application infrastructure. MCP servers run locally on your machine and help AI assistants understand and work with external services relevant to this project.

**Important:** No secrets should ever be committed to git. All API keys, tokens, and credentials are configured exclusively in your local MCP client (Claude Desktop, AI CLI, etc.) and stored in your OS keychain or the client's secure storage.

---

## Quick Summary Table

| Server           | Purpose                                         | Risk Level | Secrets Required                                          | Recommended State     |
|------------------|-------------------------------------------------|-----------|-----------------------------------------------------------|-----------------------|
| `github-official`| Read/triage issues, PRs, code, actions          | Medium    | `GITHUB_PERSONAL_ACCESS_TOKEN`                            | Enabled (read-only)   |
| `azure`          | Manage Azure resources for this project         | High      | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SUBSCRIPTION_ID` | Enabled (dev only)    |
| `redis`          | Inspect local `elder-first-redis` instance      | High      | `REDIS_URL` or `REDIS_PASSWORD`                           | Optional / guarded    |
| `context7`       | Framework/library docs (Next.js, tRPC, etc.)    | Low       | None                                                      | Already active        |
| `ref`            | Search private docs / knowledge bases           | Medium    | `REF_API_KEY` or equivalent                               | Optional              |
| `deepwiki`       | Deep analysis of GitHub repositories            | Medium    | None for public repos, PAT for private                    | Optional              |

**Risk Level Explanation:**
- **Low:** Read-only access to public documentation; no data exposure risk
- **Medium:** Can read repository data, issues, or private docs; potential information exposure
- **High:** Can modify cloud resources, databases, or infrastructure; requires careful scoping

---

## Server-by-Server Details

### github-official (GitHub MCP Server)

**What it does:**
The GitHub MCP server provides AI assistants with direct access to GitHub repositories, issues, pull requests, actions, and code. It enables workflows like triaging issues, reviewing PRs, checking CI status, and searching code.

**How to use it for Elder-First:**
- **Issue triage:** "Summarize all open issues labeled `security` and propose a triage plan"
- **PR review:** "Review PR #123 for potential multi-tenant isolation issues"
- **CI monitoring:** "Check the status of recent GitHub Actions runs"
- **Code search:** "Find all usages of `tenant_id` in the API routers"

**Safe operations:**
- Reading issues, PRs, and code
- Checking GitHub Actions status
- Searching repository content
- Viewing branch information

**Operations requiring care:**
- Creating/updating issues or PRs (enable write mode only when intentionally needed)
- Triggering workflow runs
- Creating branches or commits

**Required secrets:**
- `GITHUB_PERSONAL_ACCESS_TOKEN` - Scoped to `repo` (or more limited if possible)

**Recommended mode:**
- Start with `GITHUB_READ_ONLY=1`
- Enable write toolsets only when specifically needed
- Toolsets: `repos,issues,pull_requests,actions,context`

---

### azure (Azure MCP Server)

**What it does:**
The Azure MCP server provides AI assistants with access to Azure resources, enabling queries about resource groups, costs, deployments, and infrastructure state. It can also create and modify Azure resources.

**How to use it for Elder-First:**
- **Resource inspection:** "Show me all dev resource groups for the elder-first stack"
- **Cost analysis:** "Summarize monthly cost drivers for the 202545 project"
- **Infrastructure comparison:** "Generate a Bicep snippet for a dev Redis Cache"
- **Deployment status:** "Check the status of recent deployments"

**Safe operations:**
- Listing resource groups and resources
- Viewing deployment history
- Checking resource configuration
- Cost analysis queries

**Dangerous operations (use with extreme care):**
- Creating or deleting resources
- Modifying networking or security configurations
- Deploying infrastructure changes
- Modifying Key Vault secrets

**Required secrets:**
- `AZURE_TENANT_ID` - Your Azure AD tenant ID
- `AZURE_CLIENT_ID` - Service principal application ID
- `AZURE_CLIENT_SECRET` - Service principal secret
- `AZURE_SUBSCRIPTION_ID` - **Dev subscription only, never production**

**Recommended mode:**
- Use a **dedicated service principal** with least-privilege permissions
- Scope to **development subscription only** - never point at production
- Consider read-only RBAC role (`Reader`) for day-to-day use
- Use `Contributor` only when intentionally deploying

---

### redis (Redis MCP Server)

**What it does:**
The Redis MCP server provides AI assistants with access to inspect and query Redis instances. This is useful for debugging session state, cache contents, and queue data.

**How to use it for Elder-First:**
- **Session debugging:** "List keys matching `session:*` and show approximate sizes"
- **Cache inspection:** "Check if session cleanup cron is working"
- **Key analysis:** "Show TTL values for keys matching `cache:*`"

**Safe operations:**
- Listing keys (with pattern matching)
- Reading key values and TTLs
- Checking memory usage
- Viewing Redis info/stats

**Dangerous operations (avoid in production):**
- Deleting keys or flushing databases
- Modifying key values
- Any write operations

**Required secrets:**
- `REDIS_URL` - Full connection string including password
  - For local dev: `redis://:password@localhost:6445/0`

**Recommended mode:**
- **Local dev only** - Configure MCP to target the Docker Compose Redis (`localhost:6445`)
- **Never point at staging or production Redis**
- Use for inspection and debugging, not bulk operations
- Consider read-only Redis user if available

---

### context7 (Library Documentation MCP)

**What it does:**
Context7 provides AI assistants with up-to-date documentation for libraries and frameworks. It fetches current docs so the AI doesn't rely on potentially outdated training data.

**How to use it for Elder-First:**
- "What's the correct way to use tRPC middleware in v10?"
- "Show me Next.js 14 app router data fetching patterns"
- "How do I configure Zod validation for discriminated unions?"
- "What are the Tailwind CSS v3 utility classes for grid layouts?"

**Safe operations:**
- All operations are read-only documentation fetches

**Dangerous operations:**
- None - this is a read-only documentation service

**Required secrets:**
- None

**Recommended mode:**
- Already active, no configuration changes needed
- Useful for staying current with React, Next.js, tRPC, Zod, Tailwind, Playwright docs

---

### ref (Documentation Search MCP)

**What it does:**
The `ref` MCP server enables AI assistants to search private documentation repositories and knowledge bases. This is useful for finding internal docs, design decisions, and institutional knowledge.

**How to use it for Elder-First:**
- "Search our internal docs for `elder-first multi-tenant RLS` and summarize the enforcement rules"
- "Find documentation about the bulletin generator workflow states"
- "What do our ADRs say about authentication decisions?"

**Safe operations:**
- Searching documentation
- Reading document content
- Summarizing findings

**Dangerous operations:**
- None directly, but be aware of information exposure

**Required secrets:**
- `REF_API_KEY` - API key for the documentation service (specific to your knowledge base provider)

**Recommended mode:**
- Optional - enable when working with internal docs
- Ensure API key has read-only access to appropriate docs
- Useful for onboarding and understanding historical decisions

---

### deepwiki (Repository Analysis MCP)

**What it does:**
Deepwiki provides AI assistants with deep analysis capabilities for GitHub repositories. It can scan for patterns, TODOs, security markers, and provide structural analysis.

**How to use it for Elder-First:**
- "Scan this repo for TODOs mentioning `security` or `RLS` and group by priority"
- "Analyze the codebase structure and summarize the architecture"
- "Find all files that handle authentication and list them"
- "What patterns are used for error handling across the API?"

**Safe operations:**
- Scanning for patterns and markers
- Structural analysis
- Code pattern detection
- TODO/FIXME extraction

**Dangerous operations:**
- None - this is analysis-only

**Required secrets:**
- None for public repositories
- `GITHUB_PERSONAL_ACCESS_TOKEN` for private repositories

**Recommended mode:**
- Optional - enable when doing codebase analysis
- Useful for security reviews, architecture understanding, and technical debt assessment

---

## Security & Secrets

### No Secrets in Git

- PATs, Azure credentials, Redis passwords, and API keys must **never** go into `.env`, `.env.local`, or any committed config file
- Secrets live only in:
  - Claude Desktop / MCP client secrets UI
  - OS keychain or secret manager used by that client
  - Local-only configuration files excluded from git

### Read-Only First

- Where possible (GitHub MCP, Azure MCP), default to **read-only** modes for day-to-day coding
- Write capabilities (creating branches, modifying issues, deploying infra) should be turned on only when intentionally needed
- This reduces blast radius from AI mistakes or prompt injection attacks

### Dev vs Production Isolation

- **Azure:** Strongly recommend a **separate dev subscription** or resource group for anything the MCP can touch. Never configure production subscription IDs in MCP.
- **Redis:** Configure MCP to target only **local dev Redis** (e.g., `localhost:6445` from Docker Compose), not any shared/staging/production instance.
- **GitHub:** Consider a separate bot account with limited repo access for higher-risk operations.

### Auditability

- Favor MCP servers that log actions (e.g., some Azure implementations expose audit streams)
- GitHub actions are inherently logged in GitHub's audit log
- Redis operations can be logged with `MONITOR` in development
- Document where audit logs live for incident response

### Principle of Least Privilege

- Create dedicated service principals with minimum required permissions
- Use read-only tokens when write access isn't needed
- Scope GitHub PATs to specific repositories when possible
- Rotate credentials periodically (see `docs/SECURITY-KEY-ROTATION.md`)

---

## Setup for Claude / MCP Clients

These JSON snippets are **never meant to be committed to git**. They belong in your local MCP client configuration.

### GitHub MCP (`github-official`)

```jsonc
{
  "mcpServers": {
    "github-official": {
      "command": "/path/to/github-mcp-server",
      "args": ["stdio"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-PAT-here>",
        "GITHUB_READ_ONLY": "1",
        "GITHUB_TOOLSETS": "repos,issues,pull_requests,actions,context"
      }
    }
  }
}
```

**Notes:**
- `command` is either a local binary or an `npx` wrapper depending on your client
- PAT should be **scoped minimally** (`repo` or specific repos) and stored in secure storage
- Start with `GITHUB_READ_ONLY=1`; enable write toolsets only intentionally
- For `npx` usage: `"command": "npx", "args": ["-y", "@modelcontextprotocol/server-github", "stdio"]`

### Azure MCP (`azure`)

```jsonc
{
  "mcpServers": {
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/mcp", "stdio"],
      "env": {
        "AZURE_TENANT_ID": "<tenant-id>",
        "AZURE_CLIENT_ID": "<client-id>",
        "AZURE_CLIENT_SECRET": "<client-secret>",
        "AZURE_SUBSCRIPTION_ID": "<dev-subscription-id-only>"
      }
    }
  }
}
```

**Notes:**
- Use a **dedicated service principal** with least privilege for dev-only operations
- Do **not** point this at production subscriptions
- Create the service principal with: `az ad sp create-for-rbac --name "elder-first-mcp-dev" --role Reader --scopes /subscriptions/<dev-sub-id>`
- For write operations, grant `Contributor` on specific resource groups only

### Redis MCP (`redis`)

```jsonc
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-redis", "stdio"],
      "env": {
        "REDIS_URL": "redis://:yourpassword@localhost:6445/0"
      }
    }
  }
}
```

**Notes:**
- This should point only at the **local Docker Compose Redis** used by `elder-first-redis`
- Default usage should be for **inspection and debugging**, not bulk destructive operations
- The local Redis port is `6445` as configured in `docker-compose.yml`

### ref (Documentation Search)

```jsonc
{
  "mcpServers": {
    "ref": {
      "command": "npx",
      "args": ["-y", "@example/ref-mcp", "stdio"],
      "env": {
        "REF_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

**Notes:**
- Replace `@example/ref-mcp` with the actual package name for your documentation provider
- API key should have read-only access to documentation
- Optional - enable only when working with internal docs

### deepwiki (Repository Analysis)

```jsonc
{
  "mcpServers": {
    "deepwiki": {
      "command": "npx",
      "args": ["-y", "@example/deepwiki-mcp", "stdio"],
      "env": {
        "GITHUB_TOKEN": "<optional-for-private-repos>"
      }
    }
  }
}
```

**Notes:**
- Can read public repos without secrets
- For private repos, provide a GitHub PAT with `repo` scope
- Replace `@example/deepwiki-mcp` with the actual package name

---

## Example Workflows for Elder-First

### GitHub MCP Workflows

**Security Issue Triage:**
```
"Summarize all open issues labeled 'security' in this repo and propose a weekly triage plan with priority rankings."
```

**PR Security Review:**
```
"Open a diff review for PR #123 and highlight any possible multi-tenant isolation problems or SQL injection risks."
```

**CI Status Check:**
```
"Check the status of the last 5 GitHub Actions runs and summarize any failures."
```

### Azure MCP Workflows

**Dev Resource Overview:**
```
"Show me all dev resource groups for the elder-first stack (project code 202545) and summarize their contents."
```

**Cost Analysis:**
```
"Analyze monthly cost drivers for the 202545 project and suggest optimization opportunities."
```

**Infrastructure Comparison:**
```
"Generate a Bicep template snippet to add a dev Redis Cache and compare it with our current Docker Compose usage."
```

### Redis MCP Workflows

**Session Debugging:**
```
"List keys matching 'session:*' and show approximate sizes to check if session cleanup is working."
```

**Cache Analysis:**
```
"Show TTL distribution for cache keys and identify any that might be missing expiration."
```

### ref MCP Workflows

**Internal Docs Search:**
```
"Search our internal docs for 'elder-first multi-tenant RLS' and summarize the enforcement rules."
```

**Architecture Understanding:**
```
"Find documentation about the bulletin generator workflow states and locking mechanism."
```

### deepwiki MCP Workflows

**Security TODO Scan:**
```
"Scan this repo for TODOs mentioning 'security' or 'RLS' and group them by priority."
```

**Architecture Analysis:**
```
"Analyze the codebase structure and produce a summary of how authentication flows work."
```

---

## Template-System Notes

Once this pattern is stable, port `docs/dev/MCP-SERVERS.md` into the global `.template-system` so new SaaS repos inherit:

- Standard MCP server sections (GitHub, Azure, Redis, docs, repo analysis)
- Security & secrets guidance
- Example workflows that can be customized per vertical
- Quick summary table with risk levels

**TODO:** After validation on elder-first, create a generalized template at:
```
C:\devop\.template-system\templates\docs\dev\MCP-SERVERS.template.md
```

This will allow new projects to inherit the structure with project-specific placeholders for:
- `{{PROJECT_NAME}}` - Project display name
- `{{PROJECT_CODE}}` - Azure project code (e.g., 202545)
- `{{REDIS_PORT}}` - Local Redis port from docker-compose
- `{{AZURE_SUBSCRIPTION_HINT}}` - Dev subscription guidance

---

## Related Documentation

- [SECURITY-STATUS.md](../SECURITY-STATUS.md) - Overall security posture
- [SECURITY-KEY-ROTATION.md](../SECURITY-KEY-ROTATION.md) - Credential rotation procedures
- [PRODUCTION-DEPLOYMENT.md](../PRODUCTION-DEPLOYMENT.md) - Deployment procedures
- [DEV-ACCOUNTS.md](../DEV-ACCOUNTS.md) - Development account setup

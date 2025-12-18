# Local Development Bootstrap - Elder-First Church Platform

**Last updated:** 2025-12-18
**Scaffold:** `local-dev-bootstrap:v1`

This document describes how to set up your local development environment for Elder-First Church Platform.

## Prerequisites

- Node.js 18+ (recommend using `nvm` or `fnm`)
- Docker and Docker Compose
- pnpm (or npm/yarn)

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd elder-first-church-platform

# 2. Run the bootstrap script (one-time setup)
pnpm dev:bootstrap

# 3. Start local development
pnpm dev:local
```

## Detailed Setup

### 1. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update the values in `.env.local` with your local configuration.

### 2. Local Services (Docker)

Start local development services:

```bash
docker-compose -f docker-compose.local.yml up -d
```

Verify services are running:

```bash
docker-compose -f docker-compose.local.yml ps
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Database Setup (if applicable)

```bash
# Run migrations
pnpm db:migrate

# Seed development data (optional)
pnpm db:seed
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:bootstrap` | One-time setup for local development |
| `pnpm dev:local` | Start local development server |
| `pnpm dev` | Alias for `dev:local` |
| `pnpm test` | Run tests |
| `pnpm build` | Build for production |
| `pnpm lint` | Run linter |
| `pnpm typecheck` | Run TypeScript type checking |

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Find the process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in .env.local
PORT=3001
```

### Docker Issues

```bash
# Reset Docker containers
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f
```

### Node Modules Issues

```bash
# Clean reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Environment-Specific Notes

### Windows (WSL2)

- Use WSL2 for best Docker performance
- Ensure Docker Desktop is configured to use WSL2 backend

### macOS

- Docker Desktop is recommended
- Use `colima` as an alternative

### Linux

- Native Docker installation works best
- Ensure your user is in the `docker` group

## Need Help?

- Check the main README.md for project-specific documentation
- Review `docs/` for additional guides
- Ask in the team Slack channel

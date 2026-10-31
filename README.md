# Social Dev

[![CI](https://github.com/guilhermerissondev/social-dev/actions/workflows/ci.yml/badge.svg)](https://github.com/guilhermerissondev/social-dev/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

**A federated social network for the developer community.** Launching first in Brazil.

[Leia em português](README.pt-BR.md)

> 🚧 Early development. Not ready for production use yet.

## Why

On general-purpose networks, developers have to dig to find each other. On Social Dev, everyone is a developer:
you sign up, pick your stack and immediately find people and content that matter to you.

- **Made for code:** Markdown posts with code blocks and syntax highlighting.
- **Find your stack:** follow people and technologies, connect your GitHub or GitLab account.
- **Open and federated:** open source and connected to Mastodon and the rest of the fediverse via ActivityPub.

## Status

| Milestone                    | Status     |
| ---------------------------- | ---------- |
| M0. Discovery and planning   | ✅ Done    |
| M1. Foundation (auth, CI)    | ✅ Done    |
| M2. Core social features     | ⏳ Next    |
| M5. Federation (ActivityPub) | 📋 Planned |

The full plan (in Portuguese) is in [`docs/plano-inicial.md`](docs/plano-inicial.md) and architecture decisions are
recorded in [`docs/adr/`](docs/adr/).

## Tech stack

| Layer          | Technology                                                      |
| -------------- | --------------------------------------------------------------- |
| Web            | Next.js 16, React 19, Tailwind CSS 4, next-intl (pt-BR, en)     |
| API            | Hono, Zod, OpenAPI                                              |
| Authentication | Better Auth (email and password, GitHub, GitLab)                |
| Database       | PostgreSQL 18, Drizzle ORM                                      |
| Federation     | Fedify (ActivityPub), planned                                   |
| Tests          | Vitest, Testcontainers (real PostgreSQL), Playwright            |
| Tooling        | TypeScript (strict), pnpm workspaces, Turborepo, GitHub Actions |

## Repository layout

```
apps/
  api/        Hono API (modular monolith)
  web/        Next.js web app
packages/
  db/         Drizzle schema, migrations and test helpers
  ui/         Shared React components
infra/        Docker Compose for local services
docs/         Plan and architecture decision records (Portuguese)
```

## Getting started

Requirements: Node.js 24 (see `.nvmrc`), pnpm (via `corepack enable`) and Docker.

```bash
# 1. Install dependencies
nvm use
corepack enable
pnpm install

# 2. Configure the environment
cp .env.example .env
# then set BETTER_AUTH_SECRET, e.g. with: openssl rand -base64 32

# 3. Start PostgreSQL and Mailpit, then apply migrations
pnpm services:up
pnpm db:migrate

# 4. Run the API (http://localhost:4000) and the web app (http://localhost:3000)
pnpm dev
```

Emails sent locally (account confirmation, password reset) show up in Mailpit at http://localhost:8025.

To enable "Continue with GitHub/GitLab", create an OAuth app and fill the matching variables in `.env`
(instructions are in `.env.example`).

## Scripts

| Command                                  | What it does                                 |
| ---------------------------------------- | -------------------------------------------- |
| `pnpm dev`                               | Runs every app in watch mode                 |
| `pnpm lint` / `pnpm typecheck`           | ESLint and TypeScript checks                 |
| `pnpm test`                              | Unit and integration tests (needs Docker)    |
| `pnpm --filter @social-dev/web test:e2e` | Playwright end-to-end tests                  |
| `pnpm db:generate`                       | Generates a migration from schema changes    |
| `pnpm db:migrate`                        | Applies pending migrations                   |
| `pnpm services:up` / `services:down`     | Starts or stops local PostgreSQL and Mailpit |

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by a Git hook.
Contribution guidelines will be published once the project is more mature. In the meantime, issues are welcome.

To report a security problem, see [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0](LICENSE). If you run a modified version of Social Dev as a network service, you must make your
source code available to its users.

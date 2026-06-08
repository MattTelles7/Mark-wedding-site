# Project Rules

## Priorities

1. Reliability
2. Simplicity
3. Easy deployment
4. Elegant mobile-first design
5. Clear Git history
6. Easy future iteration

## Permanent Stack Decisions

- Next.js App Router with TypeScript
- SQLite through `better-sqlite3`
- One Docker Compose service on one Ubuntu or Debian VM
- Database path in production: `/app/data/app.db`
- Host data mount: `./data:/app/data`
- No external database, auth provider, paid service, or orchestration platform

## Security

- Validate RSVP input on the server.
- Rely on React output escaping; never render RSVP content as raw HTML.
- Keep the RSVP honeypot and submission rate limit.
- Keep the admin login rate limit.
- Store only signed admin session cookies with `httpOnly`, `sameSite`, and
  production `secure` settings.
- Keep `ADMIN_PASSWORD` and `SESSION_SECRET` in environment variables.
- Never commit `.env` or database files.
- Keep `/admin`, admin mutations, and CSV export protected server-side.

## Git Workflow

- `main`: stable releases controlled and merged manually by the project owner
- `develop`: active integration
- `feature/*`: feature work
- `fix/*`: bug fixes
- `chore/*`: maintenance

Codex works only on `develop` and `feature/*`, `fix/*`, or `chore/*` branches.
Codex must not merge `develop` into `main` or push meaningful work directly to
`main`. Work on one branch at a time. Delete a merged feature, fix, or chore
branch after it is fully merged into `develop`; never delete `main` or
`develop`.

Prefer Conventional Commits and keep each commit focused on one logical
change.

Before work, inspect Git status, the branch, this file, `PROJECT_STATE.md`, and
`TODO.md`. Before committing, run formatting, linting, type checking, tests,
and the production build. Update the project memory files when state changes.

## Deployment

- Production installation path is `/opt/wedding-rsvp`.
- App listens on port `3000`.
- Rebuilds and installer reruns must preserve `/opt/wedding-rsvp/data`.
- Never delete `/opt/wedding-rsvp/data/app.db` or an existing `.env`.
- Never run `docker compose down -v` or delete Docker volumes during updates.
- Re-running the branch-specific installer must be safe.
- Cloudflare and public TLS are outside this repository.

## Content

- Do not invent missing wedding content.
- Hide optional missing content or explicitly ask the project owner for it.
- Temporary/sample content must be identified as temporary.

## Avoid

- Kubernetes, Postgres, MySQL, and external auth providers
- Client-only admin protection
- Hardcoded secrets
- Large UI frameworks without a demonstrated need
- Unrelated refactors during focused work

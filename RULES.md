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

- `main`: stable finished product
- `develop`: active integration
- `feature/*`: feature work
- `fix/*`: bug fixes
- `chore/*`: maintenance

Do not commit meaningful work directly to `main`. Prefer Conventional Commits
and keep each commit focused on one logical change.

Before work, inspect Git status, the branch, this file, `PROJECT_STATE.md`, and
`TODO.md`. Before committing, run formatting, linting, type checking, tests,
and the production build. Update the project memory files when state changes.

## Deployment

- Production installation path is `/opt/wedding-rsvp`.
- App listens on port `3000`.
- Rebuilds must preserve `/opt/wedding-rsvp/data`.
- Cloudflare and public TLS are outside this repository.

## Avoid

- Kubernetes, Postgres, MySQL, and external auth providers
- Client-only admin protection
- Hardcoded secrets
- Large UI frameworks without a demonstrated need
- Unrelated refactors during focused work

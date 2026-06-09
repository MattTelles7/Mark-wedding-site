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
`main`. Work on one branch at a time.

When feature, fix, or chore work is complete, Codex must finish the integration
workflow in the same task unless the user explicitly pauses it or a documented
blocker prevents it:

1. Run the full required validation suite.
2. Push the completed branch and open a pull request targeting `develop`.
3. Wait for required GitHub checks and address failures.
4. Merge the passing pull request into `develop`.
5. Fast-forward the local `develop` branch.
6. Delete the merged branch locally and remotely.

Do not leave completed work only on a feature, fix, or chore branch. Audit and
remove redundant branches once their commits are confirmed in `develop`.
Never delete `main` or `develop`.

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

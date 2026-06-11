# Copilot Instructions

## Required Orientation

Read `RULES.md` and `PROJECT_STATE.md` before making changes. Treat those files,
the current checkout, and current GitHub state as authoritative; never trust
stale chat memory or an old AI handoff over the repository.

Preserve PostgreSQL data, work from `develop` through short-lived branches, open
pull requests into `develop`, and delete merged feature/fix branches. `main` is
manual-release only.

## Commands

```bash
npm run format        # Prettier check (fix: npx prettier --write .)
npm run lint          # ESLint, zero warnings allowed
npm run typecheck     # tsc --noEmit
npm test              # Vitest tests (DB integration tests skip without DATABASE_URL)
npm run build         # Next.js production build
npm run dev           # Dev server at http://localhost:3000
npm run db:migrate    # Run database migrations manually (requires DATABASE_URL)
```

Run a single test file:

```bash
npx vitest run lib/admin-service.test.ts
```

Full pre-commit sequence (required before every commit):

```bash
npm run format && npm run lint && npm run typecheck && npm test && npm run build
```

## Architecture

Next.js App Router with TypeScript. PostgreSQL via `pg` (node-postgres, no ORM).
Docker Compose stack: `app` + `postgres` containers. One Ubuntu/Debian VM.

**Request flow:**

- Public pages: `app/page.tsx` (homepage), `app/rsvp/` (surname search → per-person RSVP form)
- Admin: `app/admin/` (login at `/admin`, household management dashboard)
- Server Actions in `app/rsvp/actions.ts` and `app/admin/actions.ts`
- Business logic: `lib/admin-service.ts`, `lib/admin-validation.ts`
- Admin XLSX import: `app/admin/bulk-import-families.tsx`,
  `app/admin/import/actions.ts`, `app/admin/import/template/route.ts`,
  `lib/import-template.ts`, `lib/import-parser.ts`, `lib/import-service.ts`
- Auth: `lib/auth.ts` — signed 8-hour session cookie, no user accounts
- Database: `lib/database.ts` — async Postgres functions (no class, no ORM)
- DB pool: `lib/db.ts` — lazy Pool singleton, `query`, `queryOne`, `withTransaction`
- Migrations: `lib/migrate.ts` — forward-only, tracked by name in `migrations` table
- Startup: `instrumentation.ts` — Next.js startup hook that runs migrations
- Site config: `lib/site.ts` — reads wedding content from env vars, never hardcodes personal data
- Rate limiting: `lib/rate-limit.ts` — intentionally in-memory (single process)

**Key tables:** `households`, `invited_guests`, `settings` (contains `rsvps_open`)

## Git Workflow

- `main`: stable releases, merged manually by project owner only
- `develop`: active integration branch — **work here or on short-lived branches**
- `feature/*`, `fix/*`, `chore/*`: merged into `develop` via PR, then deleted

**Do not push directly to `main` or merge `develop` → `main`.**

When feature/fix/chore work is complete, finish the full integration in the same session:

1. Run the full validation suite
2. Push branch and open a PR targeting `develop`
3. Wait for CI to pass; fix failures
4. Merge the PR into `develop`
5. Fast-forward local `develop`, delete the merged branch locally and remotely

Use Conventional Commits. Keep each commit to one logical change.

## Key Conventions

**Postgres migrations are forward-only and additive.** Never drop, truncate, or rewrite tables. New migrations are added to `lib/migrate.ts` with a unique name. Always preserve all household, guest, and settings data.

**Admin autosave on blur.** Household name, person name, RSVP status, and notes all save to Postgres when the field loses focus. No Save button. Show `saving` → `saved` / `error` feedback without discarding typed values.

**Atomic household creation.** A household and its first invited person are created in one Postgres transaction. The final invited person in a household cannot be deleted.

**Surname search is exact and normalized.** Public search matches `search_last_name` case-insensitively (`LOWER()`); results are capped at 10 households.

**Public RSVP locking.** Confirming a household uses `SELECT ... FOR UPDATE` and sets `is_locked = TRUE` in one transaction. Only the admin can edit or unlock afterward.

**Wedding content comes from env vars** (`COUPLE_NAMES`, `WEDDING_DATE`, `CEREMONY_ADDRESS`, etc.) via `lib/site.ts`. Missing optional content is hidden; never invent or approximate it.

**CSV formula injection prevention.** Values that can trigger spreadsheet formulas are prefixed in `lib/csv.ts`.

**XLSX bulk imports are add-only.** Admin imports may create missing households
and invited people, skip duplicate people, and report invalid rows. They must
never update or delete existing households/guests. Matching is normalized
Household Name + Last Name; duplicate people are same household + first name +
last name. Uploads are converted from `File.arrayBuffer()` to a Node `Buffer`,
parsed in memory with ExcelJS, and discarded. Do not bundle ExcelJS into the
Next.js server output. Parse failures must log filename, file size, MIME type,
parse stage, and the underlying error without logging workbook contents.

**Security rules:**

- All admin mutations and CSV export are protected server-side
- Session cookie: `httpOnly`, `sameSite: lax`, `secure` when `SESSION_COOKIE_SECURE=true`
- Honeypot field and in-memory rate limits on RSVP search and submission
- Proxy forwarding headers trusted only when `TRUST_PROXY_HEADERS=true`
- Never commit `.env`
- NEVER run `docker compose down -v` — this destroys Postgres data

## Environment Variables

```bash
cp .env.example .env
```

| Variable                                 | Purpose                                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| `ADMIN_PASSWORD`                         | Admin login password (`admin` for local dev only)               |
| `SESSION_SECRET`                         | Signs session cookie (32+ random chars, NOT the login password) |
| `SESSION_COOKIE_SECURE`                  | `false` for HTTP dev/test, `true` for HTTPS production          |
| `DATABASE_URL`                           | Postgres connection string (required)                           |
| `POSTGRES_DB`                            | Postgres database name (used by docker-compose)                 |
| `POSTGRES_USER`                          | Postgres user (used by docker-compose)                          |
| `POSTGRES_PASSWORD`                      | Postgres password (used by docker-compose)                      |
| `NEXT_SERVER_ACTION_ALLOWED_ORIGINS`     | Public proxy hostnames allowed to submit server actions         |
| `WEDDING_DATE_ISO`, `COUPLE_NAMES`, etc. | Wedding display content                                         |

## Deployment

```bash
docker compose up -d --build   # Build and start app + postgres
curl http://localhost:3000/api/health   # Should return { status: "ok", database: "ok" }
```

Production install path: `/opt/wedding-rsvp`.
Postgres data stored in Docker named volume `postgres_data`.

**⚠️ NEVER run `docker compose down -v`. This destroys the Postgres volume and all RSVP data.**

VM install/update scripts: `install.sh`, `update.sh`. Re-running either is safe and preserves `.env` and `postgres_data` volume.

Backups are through Proxmox VM snapshots. No app-level backup script exists.

## Project Memory Files

Always read these before starting work, and update them when state changes:

- `RULES.md` — permanent technical and workflow rules
- `PROJECT_STATE.md` — current implementation and deployment state
- `TODO.md` — planned work and acceptance checks
- `CHANGELOG.md` — user-visible changes

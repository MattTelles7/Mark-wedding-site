# Project State

## Agent Handoff Summary

- **Read first**: `RULES.md` and this file are authoritative. Repository files
  and current Git/GitHub state override stale chat memory or prior AI summaries.
- **Stack**: Next.js App Router, TypeScript, Node.js 22, PostgreSQL 17 through
  `pg`, Docker Compose, and the persistent `postgres_data` named volume.
- **Branches**: `develop` is active integration; `main` is manual release only.
  XLSX repair PR #19 is merged at `18c7ee2`; its fix branch is deleted locally
  and remotely. There are no open pull requests.
- **Deployment/data**: the test VM is expected at `192.168.50.194:3000`.
  PostgreSQL data must never be reset, truncated, replaced, or removed. Never
  run `docker compose down -v`.
- **Current focus**: simplify the admin `.xlsx` import and validate it on the
  test VM. New templates use one person per row with `First Name`, `Last Name`,
  `Email`, `Phone`, and `Admin Notes`; matching last names become
  `The [Last Name] Family`. Import remains admin-only, in-memory, transactional,
  add-only, duplicate-aware, and unable to update or delete existing records.
- **Recent work**: PostgreSQL migration, admin household management, Cloudflare
  Server Action origins, and admin XLSX template/preview/import are merged into
  `develop`.
- **Validation**: generated-template upload, populated ExcelJS workbook parsing,
  malformed binary handling, readable-workbook format errors, formatting, lint,
  type checking, PostgreSQL-backed import and duplicate re-upload tests, the
  production build, and deployment-script syntax pass in local and GitHub CI.
- **Pending**: deploy the merged parser fix to the test VM; verify template
  download/re-upload, populated workbook preview/import, duplicate re-upload,
  unchanged existing data, public surname lookup, app restart/rebuild
  persistence, and server log diagnostics. On June 11, 2026, SSH to
  `192.168.50.194` timed out through the current VPN route.
- **Commands**: `npm run format`, `npm run lint`, `npm run typecheck`,
  `npm test`, `npm run build`, `bash -n install.sh update.sh`,
  `docker compose up -d --build`, and
  `curl http://localhost:3000/api/health`.

## Current Status

- `develop` is the active integration branch.
- The app has been migrated from SQLite to PostgreSQL.
- Admin login crash was fixed by removing the SQLite dependency and ensuring
  all database calls are properly async.
- Admin-only `.xlsx` bulk import for households and invited guests is available
  from the dashboard.
- The XLSX upload parser repair keeps ExcelJS external to the Next.js server
  bundle, adds upload-stage diagnostics, and distinguishes unreadable files from
  readable workbooks with bad structure.
- New XLSX templates use five human-readable columns and group people by last
  name. The previous seven-column workbook remains accepted for compatibility.
- All public pages remain unchanged in design.
- Reception and ceremony details are confirmed and displayed correctly.
- Registry section is permanently removed.
- Favicon and Apple touch icon are in place.

## Last Completed Feature

Admin XLSX bulk import: admins can download a styled Excel template, upload a
completed `.xlsx`, preview row-level errors/warnings/duplicates, and import valid
rows into Postgres without updating or deleting existing records.

## Database

- **Database engine**: PostgreSQL 17 (in Docker Compose)
- **Connection**: `DATABASE_URL` environment variable (required)
- **Volume**: Docker named volume `postgres_data` (never delete)
- **Migrations**: `lib/migrate.ts` — forward-only, idempotent, tracked by name in
  `migrations` table
- **Migration 001**: Creates `settings`, `households`, and `invited_guests`
  tables
- **Migration 002**: Drops the unused `legacy_rsvps` table if present
- **Old SQLite data**: Intentionally abandoned. No real production data existed at
  time of migration.

## Known Missing Content

All ceremony and reception details are confirmed and displayed. No content is
intentionally hidden or placeholder. The only remaining pre-launch work is using
the admin bulk import to load the real invitation household/guest list and
completing VM validation.

## Pending Validation

- Deploy merged `develop` commit `18c7ee2` or later to the Debian test VM once
  `192.168.50.194` is reachable.
- Verify postgres container healthy (`docker compose ps`).
- Verify `/api/health` returns `{ status: "ok", database: "ok" }`.
- Verify admin login works with configured `ADMIN_PASSWORD`.
- Verify household creation, guest management, public RSVP flow.
- Verify the downloaded XLSX template can be uploaded and previewed.
- Verify a populated XLSX previews/imports and a second upload skips duplicates.
- Verify existing household contacts, guest notes/statuses, households, and
  guests remain unchanged by import.
- Confirm failed XLSX parsing logs filename, size, MIME type, parse stage, and
  the underlying ExcelJS error without logging spreadsheet contents.
- Confirm Postgres data survives `docker compose restart app`.
- Confirm Postgres data survives `docker compose up -d --build`.
- Import the real invitation household and guest list.
- Confirm household and invited-person data persists through a VM reboot.
- Test a branch-aware fresh install on a clean Ubuntu or Debian VM.

## Deployment Assumptions

- One Ubuntu or Debian VM
- Install path: `/opt/wedding-rsvp`
- App port: `3000`
- Cloudflare and TLS handled outside the app
- Postgres data stored in Docker named volume: `postgres_data`
- `develop` is used for active VM testing.
- `main` is updated only by a manual project-owner release decision.
- Completed feature, fix, and chore branches are merged into `develop` through
  passing pull requests and then deleted locally and remotely.
- Re-running `install.sh --branch develop|main` installs or safely updates.
- `update.sh` defaults to the current branch and accepts the same branch flag.
- Existing `.env` is preserved. Postgres env vars are generated if missing.
- Fresh installs generate `POSTGRES_PASSWORD`, `DATABASE_URL`, and print a
  generated `ADMIN_PASSWORD` once; updates do not replace existing credentials.
- `SESSION_COOKIE_SECURE=false` supports isolated HTTP testing. Public HTTPS
  deployments must set it to `true`.

## Important Commands

```bash
npm run dev
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm run db:migrate
docker compose up -d --build
docker compose ps
docker compose logs -f app
docker compose logs -f postgres
docker compose exec postgres psql -U wedding_rsvp -d wedding_rsvp
docker compose restart app
curl http://localhost:3000/api/health
```

## Important Paths

- Public pages: `app/`
- Household RSVP actions: `app/rsvp/actions.ts`
- Admin actions: `app/admin/actions.ts`
- Admin household editor: `app/admin/household-manager.tsx`
- Admin validation and persistence service: `lib/admin-validation.ts`,
  `lib/admin-service.ts`
- Database functions: `lib/database.ts`
- Database pool + helpers: `lib/db.ts`
- Migration runner: `lib/migrate.ts`
- Migration CLI script: `scripts/migrate.ts`
- XLSX import template/parser/service: `lib/import-template.ts`,
  `lib/import-parser.ts`, `lib/import-service.ts`, `lib/import-types.ts`
- Admin bulk import UI/actions/routes: `app/admin/bulk-import-families.tsx`,
  `app/admin/import/actions.ts`, `app/admin/import/template/route.ts`
- Startup hook: `instrumentation.ts`
- Authentication: `lib/auth.ts`
- Deployment scripts: `install.sh`, `update.sh`

## Database Schema

PostgreSQL tables created by migration `001_initial_schema`:

Table `migrations`:

- `id BIGSERIAL PRIMARY KEY`
- `name TEXT UNIQUE NOT NULL`
- `applied_at TIMESTAMPTZ`

Table `settings`:

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `rsvps_open` is inserted as `false` when missing.

Table `households`:

- `id BIGSERIAL PRIMARY KEY`
- `household_name TEXT NOT NULL`
- `search_last_name TEXT NOT NULL` (normalized for exact public search)
- optional `contact_email` and `contact_phone`
- `is_locked BOOLEAN NOT NULL DEFAULT FALSE`
- optional `submitted_at TIMESTAMPTZ`
- `created_at` and `updated_at TIMESTAMPTZ`

Table `invited_guests`:

- `id BIGSERIAL PRIMARY KEY`
- `household_id` references `households(id)` with cascade deletion
- `first_name TEXT NOT NULL`
- `last_name TEXT NOT NULL`
- `rsvp_status` constrained to `pending`, `attending`, or `declined`
- optional admin-only `notes`
- `created_at` and `updated_at TIMESTAMPTZ`

## Decisions for Future Sessions

- Wedding display content comes from runtime environment variables where practical.
- Unknown wedding details must remain hidden or use only approved placeholders.
- Public surname search is exact, normalized, rate-limited, and capped at ten
  household results.
- Public household confirmation updates every invited person and locks the
  household in one atomic Postgres transaction with `SELECT ... FOR UPDATE`.
- Only the admin can edit responses or unlock a submitted household.
- Admin household and invited-person edits save to Postgres when the field loses
  focus and display saving, saved, or failure feedback without discarding typed values.
- A household is created transactionally with at least one invited person, and
  its final invited person cannot be deleted separately.
- The app uses signed, eight-hour admin session cookies rather than accounts.
- Rate limiting is intentionally in-memory for the single-process deployment.
- CSV cells that can trigger spreadsheet formulas are prefixed safely.
- Admin `.xlsx` imports are add-only: existing households/guests are matched for
  duplicate detection but never updated or deleted by import.
- Simple import matching uses normalized generated household name + last name.
  The generated name is `The [Last Name] Family`. Legacy templates may still
  supply their former household/person override columns. Duplicate guest
  detection uses same household + same first name + same last name.
- Template limits are `.xlsx` only, 10 MB maximum upload, 5,000 data rows.
- Proxy forwarding headers are trusted only when `TRUST_PROXY_HEADERS=true`.
- `ADMIN_PASSWORD` is the admin login password. `SESSION_SECRET` signs cookies and
  is never typed by the user.
- Backups are via Proxmox VM snapshots. No app-level backup script exists.
- The `postgres_data` Docker named volume must never be deleted. Never run
  `docker compose down -v`.
- Reception details are confirmed: Knights of Columbus Hall, 333 Main Street,
  Brookville, IN 47012, directly following Mass.
- Ceremony address is confirmed: St. Joseph's Catholic Church, 7536 Church Ln,
  West Harrison, IN 47060.
- There is no registry. All registry code has been permanently removed.
- The browser tab favicon is `app/icon.png` (512×512), an Apple touch icon is
  `app/apple-icon.png` (180×180). Both are square crops from the bottom half of
  `mark-guerdithe-silhouette.jpg`.

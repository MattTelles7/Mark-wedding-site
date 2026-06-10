# Project State

## Current Status

- `develop` is the active integration branch.
- `feature/postgres-migration` is the current in-progress branch.
- The app has been migrated from SQLite to PostgreSQL.
- Admin login crash was fixed by removing the SQLite dependency and ensuring
  all database calls are properly async.
- All public pages remain unchanged in design.
- Reception and ceremony details are confirmed and displayed correctly.
- Registry section is permanently removed.
- Favicon and Apple touch icon are in place.

## Last Completed Feature

Postgres migration: switched from SQLite (`better-sqlite3`) to PostgreSQL (`pg`)
with Docker Compose postgres service, named volume `postgres_data`, automatic
startup migrations via `instrumentation.ts`, and updated CI with Postgres service.

## Database

- **Database engine**: PostgreSQL 17 (in Docker Compose)
- **Connection**: `DATABASE_URL` environment variable (required)
- **Volume**: Docker named volume `postgres_data` (never delete)
- **Migrations**: `lib/migrate.ts` — forward-only, idempotent, tracked by name in
  `migrations` table
- **Migration 001**: Creates `migrations`, `settings`, `households`,
  `invited_guests`, `legacy_rsvps` tables
- **Old SQLite data**: Intentionally abandoned. No real production data existed at
  time of migration.

## Known Missing Content

All ceremony and reception details are confirmed and displayed. No content is
intentionally hidden or placeholder. The only remaining pre-launch work is
importing the real invitation household/guest list and completing VM validation.

## Pending Validation

- Deploy `feature/postgres-migration` to Debian test VM.
- Verify postgres container healthy (`docker compose ps`).
- Verify `/api/health` returns `{ status: "ok", database: "ok" }`.
- Verify admin login works with configured `ADMIN_PASSWORD`.
- Verify household creation, guest management, public RSVP flow.
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

Table `legacy_rsvps`:

- `id BIGSERIAL PRIMARY KEY`
- Preserves free-form responses from the old RSVP system
- Read-only; no new rows are inserted

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

# Changelog

All notable changes to this project are documented here.

## Unreleased

### Added

- Admin-only `.xlsx` bulk import for households and invited guests:
  - downloadable Excel template with `Guests`, `Instructions`, and `Example`
    sheets
  - server-side preview with row-level errors, warnings, duplicate detection,
    households to create, existing households matched, and guests to create
  - add-only final import that creates valid new households/guests, skips
    duplicates, and never updates/deletes existing records
  - 10 MB upload limit and 5,000 data-row guard
- PostgreSQL 17 database service in Docker Compose with named volume
  `postgres_data` (never deleted by installer or updater)
- `lib/db.ts` — lazy Postgres pool singleton with `query`, `queryOne`,
  `withTransaction`, and `checkDatabaseConnection` helpers
- `lib/migrate.ts` — forward-only, idempotent migration runner tracked by name
  in a `migrations` table
- `scripts/migrate.ts` — CLI migration runner invoked by `npm run db:migrate`
- `instrumentation.ts` — Next.js startup hook that runs migrations before the
  app serves traffic
- `vitest.config.ts` — Vitest configuration with global setup for migrations and
  per-test table truncation; database integration tests skip gracefully without
  `DATABASE_URL`
- `/api/health` now checks Postgres connectivity with `SELECT 1` and returns
  `{ status: "ok", database: "ok" }` or `503` if unreachable
- CI workflow now starts a Postgres 17 service container and runs migrations
  before tests

### Changed

- All database code rewritten from synchronous SQLite to async Postgres (`pg`)
- `lib/database.ts` — complete rewrite as async functions; all queries use
  `$1, $2, ...` parameterization; `confirmHousehold` uses
  `SELECT ... FOR UPDATE` for concurrency safety
- `lib/admin-service.ts` — `AdminHouseholdRepository` methods now return
  `Promise`; all four service functions are async
- `app/admin/page.tsx`, `app/rsvp/page.tsx` — added `await` to all DB calls
- `app/admin/actions.ts`, `app/rsvp/actions.ts` — all DB calls now awaited
- `app/admin/export/route.ts` — `getHouseholdExportRows()` awaited
- `docker-compose.yml` — added `postgres` service; removed `./data:/app/data`
  bind mount; app depends on postgres health check
- `Dockerfile` — removed `python3 make g++` build tools (no longer needed)
- `next.config.ts` — removed `serverExternalPackages: ["better-sqlite3"]`
- `install.sh` — generates `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
  `DATABASE_URL` if missing; removed SQLite data-dir assertions; never runs
  `docker compose down -v`
- `update.sh` — removed SQLite data-dir check; asserts `postgres_data` volume
  presence; prints data-preservation warning
- `.env.example` — added Postgres env vars; removed `DATABASE_PATH`
- `package.json` — removed `better-sqlite3`, added `pg@8.16.0`,
  `@types/pg@8.11.14`, `tsx@4.19.4`; added `db:migrate` script
- `lib/database.test.ts`, `lib/admin-service.test.ts`,
  `app/admin/actions.test.ts` — fully rewritten for async Postgres; unit tests
  use mock repositories; integration tests skip without `DATABASE_URL`

### Removed

- `better-sqlite3` and `@types/better-sqlite3` runtime dependencies
- `WeddingDatabase` class and all synchronous SQLite code
- `./data:/app/data` Docker bind mount

### Fixed

- Admin login crash: previously the synchronous SQLite `WeddingDatabase` class
  failed during async Next.js request processing; all database access is now
  properly async and the admin session flow is stable

  7536 Church Ln, West Harrison, IN 47060 — displayed beneath the venue
  on the homepage schedule and event card

- Confirmed reception details: Knights of Columbus Hall, 333 Main Street,
  Brookville, IN 47012, directly following Mass — displayed on the homepage
  schedule and event card
- Browser tab favicon (`app/icon.png`, 512×512) and Apple touch icon
  (`app/apple-icon.png`, 180×180) cropped from the bottom half of the
  couple silhouette engagement photo

### Removed

- Registry section and nav link removed entirely; there is no registry for
  this wedding

### Changed

- Reception event card now shows venue, address, and timing instead of the
  former placeholder

- Custom navy/cream invitation-inspired homepage for Mark & Guerdithe
- Confirmed hosts, formal invitation wording, wedding date, ceremony time and
  venue, and RSVP deadline
- Three supplied engagement photos with responsive hero and invitation layouts
- Hydration-safe live countdown with wedding-day minutes and post-event state
- Reduced-motion-aware CSS reveals for homepage copy and photo cards
- Additive SQLite migration with `settings`, `households`, and
  `invited_guests` tables while preserving the original `rsvps` table
- Exact, rate-limited surname search with household selection and per-person
  attending/declined responses
- Atomic final household confirmation and public response locking
- Database-backed RSVP open/closed control
- Admin household and invited-person creation, editing, filtering, locking,
  unlocking, response editing, and confirmed deletion controls
- Atomic household creation that requires at least one invited person
- Blur-based SQLite autosave for household fields, invited people, statuses,
  and admin notes with visible saving, saved, and failure feedback
- Inline admin validation, household-name suggestions, and invited-person
  surname defaults
- Six household/guest dashboard counts and individual-level CSV export
- Migration, household workflow, validation, countdown, and CSV regression
  tests
- Branch-aware install and update commands for `develop` and `main`
- GitHub Actions CI for formatting, linting, types, tests, builds, and shell
  syntax
- Lightweight `/api/health` endpoint used by the Docker healthcheck
- VM reboot, troubleshooting, branch switching, and persistence documentation
- Mobile-first wedding landing page with details and registry sections
- Server-validated RSVP actions backed by SQLite
- Honeypot and basic in-memory RSVP rate limiting
- Password-protected admin login with signed HTTP-only session cookies
- Password-protected household RSVP dashboard and CSV export
- Docker image, Docker Compose service, and persistent database mount
- Ubuntu/Debian install and update scripts
- Project rules, state, deployment, and customization documentation

### Changed

- Removed all temporary template sections and unapproved personal details
- New public responses now use invited households; legacy free-form responses
  remain preserved and read-only in the admin dashboard
- Installer reruns now preserve `.env`, `data`, and `data/app.db` while safely
  checking out only `develop` or `main`
- Updates now refuse dirty/diverged Git state or deployment layouts that could
  bypass the persistent data mount
- Docker healthchecks now use `/api/health`
- Local and isolated test environments use a portable SQLite path and can keep
  admin sessions over HTTP; public HTTPS deployments can require secure cookies
- Completed work now requires a passing pull request into `develop`, followed
  by local and remote branch cleanup
- GitHub Actions now uses the Node.js 24-based checkout and setup-node actions
- Admin terminology now uses `Last Name`, `Open for Submission`, and
  `Submitted and Closed`, with matching reopen/close actions
- The admin prevents empty household shells and protects the final invited
  person from separate deletion

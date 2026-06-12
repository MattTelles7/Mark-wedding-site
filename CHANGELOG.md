# Changelog

All notable changes to this project are documented here.

## Unreleased

### Added

- Admin-only `.xlsx` import with a downloadable `Guests`, `Instructions`, and
  `Example` workbook.
- Dry-run previews for families to create, existing families matched, people to
  create, duplicates skipped, warnings, and rejected rows.
- PostgreSQL-backed regression coverage for add-only imports, duplicate
  re-uploads, transaction rollback, and existing-record preservation.
- Regression coverage for namespace-prefixed workbook XML that ExcelJS cannot
  read.

### Changed

- New guest templates use `First Name`, `Last Name`, `Email`, `Phone`, and
  `Admin Notes`, with one invited person per row.
- People with the same last name are grouped into
  `The [Last Name] Family`.
- Import headers accept documented aliases, punctuation differences, reordered
  columns, and unrelated extra columns.
- The previous seven-column workbook remains accepted for backward
  compatibility.
- Import previews list each family with the people who will be added.
- Project handoff and operating documentation now consistently describe the
  Postgres stack and simple add-only import.
- Uploaded workbooks are decoded with SheetJS 0.20.3. ExcelJS remains only for
  styled template generation.

### Fixed

- Uploaded workbooks are read from `File.arrayBuffer()` into a Node `Buffer`
  before SheetJS parsing.
- Structurally valid workbooks with namespace-prefixed `workbook.xml` roots now
  parse successfully.
- SheetJS and ExcelJS remain external Node dependencies instead of being
  rewritten in the Next.js server bundle.
- Readable workbooks with missing sheets or required headers report a format
  error instead of an unreadable-file error.
- Upload diagnostics record filename, size, MIME type, parse stage, sheet
  names, and the underlying error without logging spreadsheet contents.
- Concurrent imports are serialized, rejected-row counts are deduplicated, and
  duplicate household records no longer hide existing guest matches.

### Removed

- A retired startup migration that could drop the historical
  `legacy_rsvps` table.
- Obsolete SQLite directory placeholders and unused legacy-response admin CSS.

## Historical

### PostgreSQL Migration

- Replaced the synchronous SQLite implementation with PostgreSQL 17 and async
  `pg` database access.
- Added the `postgres` Docker Compose service and persistent `postgres_data`
  named volume.
- Added forward-only startup migrations, a migration CLI, and a database-aware
  `/api/health` endpoint.
- Updated CI to run PostgreSQL-backed integration tests.
- Removed `better-sqlite3`, the `WeddingDatabase` class, `DATABASE_PATH`, and the
  former `./data:/app/data` Docker bind mount.
- Updated installer and updater behavior to preserve `.env` and
  `postgres_data`; neither script runs `docker compose down -v`.
- Fixed the admin login crash caused by the former synchronous database layer.

### Household RSVP And Admin

- Replaced free-form responses with household invitations and individual
  invited-person RSVP statuses.
- Added exact normalized surname search, household selection, atomic
  confirmation, public locking, and admin unlock/edit controls.
- Added admin household and invited-person creation, autosave, validation,
  deletion safeguards, dashboard counts, and formula-safe CSV export.
- Added an admin RSVP availability control stored in the database.
- Added signed admin sessions, rate limits, honeypot validation, and proxy-header
  trust controls.

### Wedding Site And Deployment

- Added the invitation-inspired public site for Mark and Guerdithe with the
  confirmed date, ceremony, reception, hosts, countdown, and supplied
  photography.
- Added responsive layouts, reduced-motion handling, favicon, and Apple touch
  icon.
- Removed the registry section and navigation link.
- Added Docker packaging, branch-aware Ubuntu/Debian install and update scripts,
  health checks, deployment documentation, and GitHub Actions validation.

### Earlier SQLite Phase

- The project originally used SQLite for free-form responses and later for the
  first household RSVP implementation.
- Historical installer behavior preserved `data/app.db`, and historical
  deployments mounted `/app/data`.
- Those details are retained here only as project history; PostgreSQL is the
  sole current database.

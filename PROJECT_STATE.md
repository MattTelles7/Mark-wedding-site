# Project State

## Current Status

- `develop` remains the active integration branch.
- Invitation redesign work is on `feature/invitation-redesign` and has not been
  merged into `develop` or `main`.
- The homepage now uses confirmed Mark & Guerdithe wedding information with a
  custom navy/cream invitation design.
- The public RSVP flow uses admin-created households and individual invited
  people rather than free-form submissions.
- The admin can open or close RSVPs, manage households and people, edit
  responses, lock or unlock households, view six summary counts, and export
  household/guest CSV data.
- The original `rsvps` table and any existing rows are preserved as read-only
  legacy responses in the admin dashboard.
- Branch-aware Docker and VM install/update files remain present.

## Last Completed Feature

Invitation-inspired wedding content and design, live countdown and photo-card
reveals, plus the household-based RSVP and admin management system.

## Known Missing Content

- Ceremony address
- Reception time and location
- Registry links/details
- Hero and portrait photos

The site intentionally hides the unknown ceremony address and shows only the
approved “Reception details to follow” and “Registry details coming soon.”
placeholders.

## Pending Validation

- Deploy this feature branch to the Debian 13 test VM and confirm that the
  additive migration preserves the existing SQLite file and legacy rows.
- Confirm household/guest data persists through a container restart, rebuild,
  and VM reboot.
- Test household and invited-person deletion through a real browser.
- Confirm admin logout through a real browser.
- Test a branch-aware fresh install on a second clean Ubuntu or Debian VM.
- Validate branch switching once a release exists on `main`.
- The GitHub repository is private, so unauthenticated installer and clone URLs
  require the repository to become public or authenticated VM GitHub access.

## Deployment Assumptions

- One Ubuntu or Debian VM
- Install path: `/opt/wedding-rsvp`
- App port: `3000`
- Cloudflare and TLS handled outside the app
- Persistent host directory: `/opt/wedding-rsvp/data`
- `develop` is used for active VM testing.
- `main` is updated only by a manual project-owner release decision.
- Re-running `install.sh --branch develop|main` installs or safely updates.
- `update.sh` defaults to the current branch and accepts the same branch flag.
- Existing `.env`, `data`, and `data/app.db` are preserved.

## Important Commands

```bash
npm run dev
npm run format
npm run lint
npm run typecheck
npm test
npm run build
docker compose up -d --build
curl http://localhost:3000/api/health
```

## Important Paths

- Public pages: `app/`
- Household RSVP actions: `app/rsvp/actions.ts`
- Admin actions: `app/admin/actions.ts`
- Database and migrations: `lib/database.ts`
- Database file in container: `/app/data/app.db`
- Authentication: `lib/auth.ts`
- Deployment scripts: `install.sh`, `update.sh`
- VM deployment guide: `docs/DEPLOYMENT.md`

## Database Schema

SQLite `PRAGMA user_version` is `1`. Migrations run transactionally and only add
tables/indexes; they do not drop or rewrite the legacy table.

Table `settings`:

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `rsvps_open` is inserted as `false` when missing.

Table `households`:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `household_name TEXT NOT NULL`
- `search_last_name TEXT NOT NULL` (normalized for exact public search)
- optional `contact_email` and `contact_phone`
- `is_locked INTEGER NOT NULL DEFAULT 0`
- optional `submitted_at`
- `created_at` and `updated_at`

Table `invited_guests`:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `household_id` references `households(id)` with cascade deletion
- `first_name TEXT NOT NULL`
- `last_name TEXT NOT NULL`
- `rsvp_status` constrained to `pending`, `attending`, or `declined`
- optional admin-only `notes`
- `created_at` and `updated_at`

Legacy table `rsvps` remains unchanged and is no longer used for new public
responses.

## Decisions for Future Sessions

- Wedding display content comes from runtime environment variables where
  practical.
- Unknown wedding details must remain hidden or use only approved placeholders.
- Public surname search is exact, normalized, rate-limited, and capped at ten
  household results.
- Public household confirmation updates every invited person and locks the
  household in one immediate SQLite transaction.
- Only the admin can edit responses or unlock a submitted household.
- The app uses signed, eight-hour admin session cookies rather than accounts.
- Rate limiting is intentionally in-memory for the single-process deployment.
- CSV cells that can trigger spreadsheet formulas are prefixed safely.
- Proxy forwarding headers are trusted only when `TRUST_PROXY_HEADERS=true`
  behind a trusted proxy with direct VM traffic restricted.
- On June 8, 2026, formatting, linting, type checking, 23 tests, shell syntax,
  and the production build passed locally.
- On June 8, 2026, the homepage was inspected at desktop and 390px widths with
  no horizontal overflow. The isolated browser test covered closed RSVPs,
  admin login, opening RSVPs, household/person creation, public household
  search, mixed attending/declined submission, public locking, dashboard
  counts, admin unlock, and admin response editing.
- The in-app browser reached the protected CSV download route but cannot retain
  downloads; CSV content and formula escaping are covered by unit tests.

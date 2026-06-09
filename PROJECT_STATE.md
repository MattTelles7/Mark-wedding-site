# Project State

## Current Status

- `develop` remains the active integration branch.
- `develop` contains the completed invitation, household RSVP, content, photo,
  admin-session, and VM-test work.
- Completed feature branches have been removed after integration into
  `develop`.
- The homepage now uses confirmed Mark & Guerdithe wedding information with a
  custom navy/cream invitation design.
- The public RSVP flow uses admin-created households and individual invited
  people rather than free-form submissions.
- The admin can open or close RSVPs, create households with at least one
  invited person, autosave household/person fields on blur, edit responses even
  after submission, reopen households, view six summary counts, and export
  household/guest CSV data.
- Admin household creation suggests `The [Last Name] Family`, preserves manual
  household-name edits, prefills new member surnames, validates inline, and
  prevents empty household shells or deletion of a household's final person.
- Admin submission labels are `Open for Submission` and
  `Submitted and Closed`.
- The original `rsvps` table and any existing rows are preserved as read-only
  legacy responses in the admin dashboard.
- The supplied engagement photos now appear in the responsive hero and beside
  the formal invitation.
- Local and isolated test environments can use the documented `admin`
  password. Fresh VM installs replace it with a generated password.
- The feature is deployed at `/opt/wedding-rsvp-photo` on the Debian 13 test
  VM and is reachable at `http://192.168.50.194:3000`.
- Branch-aware Docker and VM install/update files remain present.

## Last Completed Feature

Wedding content and supplied photography, responsive invitation design, live
countdown, plus the household-based RSVP system and blur-autosaving admin
management experience.

## Known Missing Content

- Ceremony address
- Reception time and location
- Registry links/details

The site intentionally hides the unknown ceremony address and shows only the
approved “Reception details to follow” and “Registry details coming soon.”
placeholders.

## Pending Validation

- Confirm household/guest data persists through a VM reboot.
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
- Completed feature, fix, and chore branches are merged into `develop` through
  passing pull requests and then deleted locally and remotely.
- Re-running `install.sh --branch develop|main` installs or safely updates.
- `update.sh` defaults to the current branch and accepts the same branch flag.
- Existing `.env`, `data`, and `data/app.db` are preserved.
- Fresh installs replace the example admin password and print the generated
  password once; updates do not replace existing credentials.
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
docker compose up -d --build
curl http://localhost:3000/api/health
```

## Important Paths

- Public pages: `app/`
- Household RSVP actions: `app/rsvp/actions.ts`
- Admin actions: `app/admin/actions.ts`
- Admin household editor: `app/admin/household-manager.tsx`
- Admin validation and persistence service: `lib/admin-validation.ts`,
  `lib/admin-service.ts`
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
- Admin household and invited-person edits save to SQLite when the field loses
  focus and display saving, saved, or failure feedback without discarding typed
  values.
- A household is created transactionally with at least one invited person, and
  its final invited person cannot be deleted separately.
- The app uses signed, eight-hour admin session cookies rather than accounts.
- Rate limiting is intentionally in-memory for the single-process deployment.
- CSV cells that can trigger spreadsheet formulas are prefixed safely.
- Proxy forwarding headers are trusted only when `TRUST_PROXY_HEADERS=true`
  behind a trusted proxy with direct VM traffic restricted.
- GitHub Actions uses `actions/checkout@v6` and `actions/setup-node@v6`, whose
  action runtime is Node.js 24.
- On June 9, 2026, the admin household editor was upgraded to strict
  validation, atomic household/person creation, and real SQLite autosave on
  blur without changing the public design.
- On June 9, 2026, the admin flow was browser-tested at desktop and 390px
  widths. The checks covered household-name suggestions, inline email errors,
  atomic creation, dirty/saving/saved feedback, persisted household/status/note
  edits, failed-save value retention, blank member-row discard, surname
  prefilling, inline member creation, closed-household admin editing, reopening,
  and no horizontal overflow.
- On June 8, 2026, the homepage was inspected at desktop and 390px widths with
  no horizontal overflow. The isolated browser test covered closed RSVPs,
  admin login, opening RSVPs, household/person creation, public household
  search, mixed attending/declined submission, public locking, dashboard
  counts, admin unlock, and admin response editing.
- The in-app browser reached the protected CSV download route but cannot retain
  downloads; CSV content and formula escaping are covered by unit tests.
- On June 9, 2026, the feature branch Docker image built and ran healthy on the
  Debian 13 VM. Browser checks confirmed the supplied photos, `admin` login,
  persistent admin sessions over isolated HTTP, the RSVP open/close control,
  and preservation of the existing SQLite file and legacy response through
  container rebuilds.

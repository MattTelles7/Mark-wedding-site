# Changelog

All notable changes to this project are documented here.

## Unreleased

### Added

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

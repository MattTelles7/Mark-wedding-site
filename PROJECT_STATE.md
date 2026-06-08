# Project State

## Current Status

- Initial wedding RSVP application implemented.
- `main` remains the initial stable/manual-release branch and does not yet
  contain the working app.
- `develop` was created from `feature/initial-wedding-rsvp`.
- `develop` is the active integration branch.
- Public landing page, RSVP flow, admin login, dashboard, deletion, and CSV
  export are present.
- Branch-aware Docker and VM install/update files are present and validated on
  the Debian 13 test VM.
- Public homepage details currently use temporary Lilly & Christopher wedding
  information from their public The Knot site.

## Last Completed Feature

Branch-aware deployment foundation with persistent installer reruns, Docker
health checks, CI, and `develop` integration workflow.

## Known Issues / Pending Validation

- Replace temporary wedding names, date, venue, schedule, story, FAQ, travel,
  and meal choices before release.
- Validate branch switching once a release exists on `main`.
- Validate a completely fresh install on a second clean Ubuntu or Debian VM.
- Test RSVP deletion and logout through a real browser.
- The GitHub repository is private, so unauthenticated raw installer and clone
  URLs do not work until it is public or VM GitHub access is configured.

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
- Database access: `lib/database.ts`
- Database file in container: `/app/data/app.db`
- Authentication: `lib/auth.ts`
- Deployment scripts: `install.sh`, `update.sh`
- VM deployment guide: `docs/DEPLOYMENT.md`

## Database Schema

Table `rsvps`:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `full_name TEXT NOT NULL`
- `attending INTEGER NOT NULL` (`0` or `1`)
- `guest_count INTEGER NOT NULL` (`0` through `10`)
- `meal_choice TEXT NOT NULL`
- `song_request TEXT NOT NULL`
- `message TEXT NOT NULL`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

Declined responses are normalized to `guest_count = 0` and
`meal_choice = not_applicable`.

## Decisions for Future Sessions

- Wedding display content comes from runtime environment variables where
  practical.
- The app uses signed, eight-hour admin session cookies rather than a user
  account table.
- Rate limiting is intentionally in-memory because deployment is a single
  long-running app process.
- CSV cells that can trigger spreadsheet formulas are prefixed safely.
- Proxy forwarding headers are trusted only when `TRUST_PROXY_HEADERS=true`;
  use that setting only behind a trusted proxy or Cloudflare with direct VM
  access restricted.
- On June 7, 2026, formatting, linting, type checking, unit tests, dependency
  audit, and the production build passed locally.
- Desktop and 390px mobile layouts were inspected. RSVP submission, admin
  protection/login, dashboard visibility, and CSV export passed against the
  local production server.
- On June 8, 2026, the app was deployed to Debian 13 with Docker Compose. RSVP
  submission, admin login, CSV export, restart recovery, and SQLite persistence
  passed on the VM before branch-aware deployment changes began.
- On June 8, 2026, the branch-aware installer safely migrated the existing
  non-Git VM deployment, preserved the exact `.env` and SQLite file, reran as
  an update, switched between test `develop` and `main` refs, rebuilt, restarted,
  and recovered automatically after a full VM reboot. The saved RSVP remained
  present throughout.

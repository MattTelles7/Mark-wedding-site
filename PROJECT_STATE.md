# Project State

## Current Status

- Initial wedding RSVP application implemented.
- Current work branch: `feature/initial-wedding-rsvp`
- Public landing page, RSVP flow, admin login, dashboard, deletion, and CSV
  export are present.
- Docker and VM install/update files are present.
- Public homepage details currently use temporary Lilly & Christopher wedding
  information from their public The Knot site.

## Last Completed Feature

Initial end-to-end application implementation with a The Knot-inspired public
design and temporary Lilly & Christopher content.

## Known Issues / Pending Validation

- Replace temporary wedding names, date, venue, schedule, story, FAQ, travel,
  and meal choices before release.
- Validate the installer on a clean Ubuntu or Debian VM.
- Validate the Docker image and database persistence after container restart.
- Test RSVP deletion and logout through a real browser.

## Deployment Assumptions

- One Ubuntu or Debian VM
- Install path: `/opt/wedding-rsvp`
- App port: `3000`
- Cloudflare and TLS handled outside the app
- Persistent host directory: `/opt/wedding-rsvp/data`

## Important Commands

```bash
npm run dev
npm run format
npm run lint
npm run typecheck
npm test
npm run build
docker compose up -d --build
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
- Docker was unavailable on the development machine, so image build and volume
  persistence remain unverified.

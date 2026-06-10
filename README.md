# Wedding RSVP

A self-hosted invitation-inspired wedding website with household-based public
RSVPs and a password-protected admin dashboard. The app runs on one Ubuntu or
Debian VM with Docker Compose. Data is stored in a PostgreSQL database running
in the same Docker Compose stack.

## Branches

- `main`: stable releases selected and merged manually by the project owner
- `develop`: active integration and VM testing
- `feature/*`, `fix/*`, `chore/*`: focused work merged into `develop`

Do not use `main` as the active development branch.

## Features

- Mobile-first navy/cream invitation homepage
- Live wedding countdown and reduced-motion-aware photo reveals
- Admin-managed households and individual invited people with inline
  validation and at least one person required per household
- Exact surname search and server-validated per-person RSVP responses
- Final household locking with admin-only editing and unlocking
- Database-backed RSVP open/closed setting
- Honeypot and in-memory search/submission rate limiting
- PostgreSQL persistence via Docker Compose named volume `postgres_data`
- Password-protected admin dashboard
- Blur-based autosave with visible admin save status
- Six response summaries, household filtering, editing, and CSV export
- Automatic schema migrations on startup (forward-only, idempotent)
- Docker Compose deployment on port `3000`
- Repeatable install and update scripts

## Local Development

1. Copy the environment template and set credentials:

   ```bash
   cp .env.example .env
   ```

2. Review the key settings:
   - `ADMIN_PASSWORD` is the password entered at `/admin`. The example value
     `admin` is for local and isolated test environments only. Change it before
     making the site publicly reachable.
   - `SESSION_SECRET` signs the admin login cookie. It is **not** the login
     password and is never typed by a user. Set it to a private random value
     of at least 32 characters.
   - `SESSION_COOKIE_SECURE=false` allows admin login over localhost or an
     isolated HTTP test VM. Set it to `true` when the public site uses HTTPS.
   - `NEXT_SERVER_ACTION_ALLOWED_ORIGINS` lists public hostnames that may submit
     Next.js server actions through Cloudflare/reverse proxies. Defaults include
     `wolfe-wedding.com` and `www.wolfe-wedding.com`.
   - `DATABASE_URL` connects to Postgres. For local dev, you need a running
     Postgres instance (e.g., via Docker: see below).
   - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` are used by the
     Postgres container started with Docker Compose.

3. Start the full stack with Docker Compose (recommended):

   ```bash
   docker compose up -d --build
   ```

4. Or start only Postgres and run the app with `npm run dev`:

   ```bash
   docker compose up -d postgres
   npm install
   npm run db:migrate
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

Public RSVPs start closed. Sign in at `/admin`, create households and invited
people, then open RSVPs when the invitation list is ready.

The admin creates each household together with its first invited person.
Household and person edits save when a field loses focus. Submitted households
remain editable by the admin and can be reopened for public submission.

## Quality Checks

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Database integration tests require `DATABASE_URL` to be set. Tests skip
gracefully without it; CI runs them against a real Postgres instance.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

The app is available at `http://localhost:3000`. Postgres data is stored in the
Docker named volume `postgres_data`. **Never run `docker compose down -v`** —
this deletes that volume and all RSVP data.

## VM Installation

These commands install a fresh VM or safely update an existing installation at
`/opt/wedding-rsvp`.

Develop VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles7/Mark-wedding-site/develop/install.sh | sudo bash -s -- --branch develop
```

Main VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles7/Mark-wedding-site/main/install.sh | sudo bash -s -- --branch main
```

The repository is currently private. Unauthenticated `curl` and Git clone
commands cannot read a private GitHub repository. These exact one-liners work
after the repository is public or when GitHub access has been configured for
the VM. The main command also requires the project owner to merge a release
into `main`.

Re-running the same one-liner:

- fetches and checks out the requested branch
- fast-forwards only to the remote branch
- rebuilds and restarts the app and Postgres
- preserves `/opt/wedding-rsvp/.env`
- preserves the `postgres_data` Docker named volume
- generates missing Postgres credentials and admin/session secrets without
  replacing existing values

On a fresh VM install, the installer generates `POSTGRES_PASSWORD`,
`DATABASE_URL`, and (if absent) `ADMIN_PASSWORD`, printing the admin password
once. Store it when shown. Existing `.env` values are never replaced during an
update.

To switch a test VM from `develop` to `main`, run the main one-liner after the
desired release has been merged to `main`. No VM reset is required.

An existing Git-based installation can also be updated directly:

```bash
sudo /opt/wedding-rsvp/update.sh --branch develop
sudo /opt/wedding-rsvp/update.sh --branch main
```

## VM Troubleshooting

```bash
cd /opt/wedding-rsvp
sudo docker compose ps
sudo docker compose logs -f app
sudo docker compose logs -f postgres
sudo docker compose exec postgres psql -U wedding_rsvp -d wedding_rsvp
sudo docker compose restart app
sudo systemctl status docker
curl http://localhost:3000
curl http://localhost:3000/api/health
```

Verify Docker starts on boot:

```bash
sudo systemctl is-enabled docker
sudo systemctl is-active docker
```

Verify reboot and data persistence:

1. Add a test household in `/admin`, open RSVPs, and submit its response.
2. Run `sudo docker compose restart app` and confirm the response remains.
3. Rebuild with `sudo docker compose up -d --build` and confirm it remains.
4. Reboot the VM, reconnect, run `sudo docker compose ps`, and confirm the
   response remains.

**⚠️ NEVER run `docker compose down -v`. This destroys the `postgres_data`
volume and all RSVP data.**

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment details and
[docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for wedding content settings.

## Project Memory

- `RULES.md`: permanent technical and workflow rules
- `PROJECT_STATE.md`: current implementation and deployment state
- `TODO.md`: planned work and acceptance checks
- `CHANGELOG.md`: user-visible changes

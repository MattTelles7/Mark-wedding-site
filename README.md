# Wedding RSVP

A self-hosted invitation-inspired wedding website with household-based public
RSVPs and a password-protected admin dashboard. The app runs on one Ubuntu or
Debian VM with Docker Compose and a persistent SQLite database.

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
- SQLite persistence in `./data/app.db`
- Password-protected admin dashboard
- Blur-based SQLite autosave with visible admin save status
- Six response summaries, household filtering, editing, and CSV export
- Additive migration that preserves the original free-form `rsvps` table
- Docker Compose deployment on port `3000`
- Repeatable install and update scripts

## Local Development

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Review the two admin settings:
   - `ADMIN_PASSWORD` is the password entered at `/admin`. The example value
     `admin` is for local and isolated test environments only. Change it before
     making the site publicly reachable.
   - `SESSION_SECRET` signs the admin login cookie. It is not the login
     password. Set it to a private random value of at least 32 characters.
   - `SESSION_COOKIE_SECURE=false` allows admin login over localhost or an
     isolated HTTP test VM. Set it to `true` when the public site uses HTTPS.

3. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The database is created automatically at `data/app.db`. Public RSVPs start
closed. Sign in at `/admin`, create households and invited people, then open
RSVPs when the invitation list is ready.

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

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

The app is available at `http://localhost:3000`. Docker mounts `./data` at
`/app/data`, so rebuilding the container does not delete RSVP responses.

## VM Installation

These commands install a fresh VM or safely update an existing installation at
`/opt/wedding-rsvp`.

Develop VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles-7/Mark-wedding-site/develop/install.sh | sudo bash -s -- --branch develop
```

Main VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles-7/Mark-wedding-site/main/install.sh | sudo bash -s -- --branch main
```

The repository is currently private. Unauthenticated `curl` and Git clone
commands cannot read a private GitHub repository. These exact one-liners work
after the repository is public or when GitHub access has been configured for
the VM. The main command also requires the project owner to merge a release
into `main`; Codex does not perform that merge.

Re-running the same one-liner:

- fetches and checks out the requested branch
- fast-forwards only to the remote branch
- rebuilds and restarts the app
- preserves `/opt/wedding-rsvp/.env`
- preserves `/opt/wedding-rsvp/data` and `data/app.db`
- generates missing admin/session secrets without replacing existing values

On a fresh VM install, the installer replaces the example `admin` password
with a generated password and prints it once. Store it when shown. Existing
`.env` values are never replaced during an update.

To switch a test VM from `develop` to `main`, run the main one-liner after the
desired release has been merged to `main`. No VM reset is required.

An existing Git-based installation can also be updated directly:

```bash
sudo /opt/wedding-rsvp/update.sh --branch develop
sudo /opt/wedding-rsvp/update.sh --branch main
```

Without `--branch`, `update.sh` updates the currently checked-out `main` or
`develop` branch.

## VM Troubleshooting

```bash
cd /opt/wedding-rsvp
sudo docker compose ps
sudo docker compose logs -f
sudo docker compose restart
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
2. Run `sudo docker compose restart` and confirm the response remains.
3. Rebuild with `sudo docker compose up -d --build` and confirm it remains.
4. Reboot the VM, reconnect, run `sudo docker compose ps`, and confirm the
   response remains.
5. Confirm `/opt/wedding-rsvp/data/app.db` still exists.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment details and
[docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for wedding content settings.

## Project Memory

- `RULES.md`: permanent technical and workflow rules
- `PROJECT_STATE.md`: current implementation and deployment state
- `TODO.md`: planned work and acceptance checks
- `CHANGELOG.md`: user-visible changes

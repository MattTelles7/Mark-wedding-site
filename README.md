# Wedding RSVP

A self-hosted wedding website with a public RSVP form and a password-protected
admin dashboard. The app is designed to run on one Ubuntu or Debian VM with
Docker Compose and a persistent SQLite database.

## Features

- Mobile-first wedding landing page
- Server-validated RSVP form with honeypot and rate limiting
- SQLite persistence in `./data/app.db`
- Password-protected admin dashboard
- RSVP summaries, deletion, and CSV export
- Docker Compose deployment on port `3000`
- Repeatable install and update scripts

## Local Development

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Set a strong `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The database is created automatically at `data/app.db`.

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

On an Ubuntu or Debian VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles-7/Mark-wedding-site/main/install.sh | bash
```

The installer clones the repository into `/opt/wedding-rsvp`, creates secrets
when needed, and starts the Docker Compose service. Set `REPO_URL` before
running the script to install from a fork.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment details and
[docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for wedding content settings.

## Project Memory

- `RULES.md`: permanent technical and workflow rules
- `PROJECT_STATE.md`: current implementation and deployment state
- `TODO.md`: planned work and acceptance checks
- `CHANGELOG.md`: user-visible changes

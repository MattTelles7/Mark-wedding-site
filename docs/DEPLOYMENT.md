# Deployment

## Target

- Ubuntu or Debian VM
- Installation path: `/opt/wedding-rsvp`
- Public app port: `3000`
- Postgres data: Docker named volume `postgres_data` (never delete)

Cloudflare, DNS, TLS, firewall rules, and VM backups are managed separately.
Backups are handled through Proxmox VM snapshots. No app-level backup script exists.

## Branch Model

- `develop` is the active integration and test deployment branch.
- `main` is the stable release branch controlled manually by the project owner.
- Running an installer for a different branch safely switches the VM checkout.

## Install or Update

Develop VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles7/Mark-wedding-site/develop/install.sh | sudo bash -s -- --branch develop
```

Main VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles7/Mark-wedding-site/main/install.sh | sudo bash -s -- --branch main
```

The same command handles a first install and later updates. It:

1. Installs Git, Docker, Docker Compose, OpenSSL, and supporting packages.
2. Enables and starts Docker through systemd.
3. Clones or safely adopts/updates `/opt/wedding-rsvp`.
4. Checks out only `main` or `develop` and requires a clean fast-forward.
5. Preserves `.env`, creating it only when absent.
6. Generates missing `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and
   `DATABASE_URL` values without overwriting existing ones.
7. Adds missing `ADMIN_PASSWORD` or `SESSION_SECRET` values without replacing
   the rest of `.env`.
8. Builds the service with `docker compose up -d --build` and reports success
   only after `/api/health` responds.

The admin password is printed only when the installer generates a new value.
The installer never runs `docker compose down -v` or deletes Docker volumes.

Keep `SESSION_COOKIE_SECURE=false` while accessing an isolated test VM over
plain HTTP. Set it to `true` before serving the public site over HTTPS.

Database schema migrations run automatically when the app starts via
`instrumentation.ts` → `lib/migrate.ts`. Migrations are forward-only and
idempotent. Future migrations must never drop or rewrite existing data.

When `/opt/wedding-rsvp` is an older non-Git installation, the installer moves
the previous app files to `/opt/wedding-rsvp.pre-git-<timestamp>`, creates a Git
checkout, and moves the existing `.env` into it.

## Direct Updates

```bash
sudo /opt/wedding-rsvp/update.sh --branch develop
sudo /opt/wedding-rsvp/update.sh --branch main
```

Omit `--branch` to update the currently checked-out `main` or `develop`
branch. The updater refuses dirty or diverged checkouts, a missing `.env`, or a
Compose file that does not define the `postgres_data` volume.

To move a test VM from `develop` to `main`, run either the main one-liner or:

```bash
sudo /opt/wedding-rsvp/update.sh --branch main
```

## Troubleshooting

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

The Compose services use `restart: unless-stopped`, and the installer enables
Docker at boot. Check both:

```bash
sudo systemctl is-enabled docker
sudo systemctl is-active docker
sudo docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' wedding-rsvp
```

## Reboot and Persistence Test

1. Add a recognizable household in `/admin`, open RSVPs, submit its response,
   and confirm the household is locked.
2. Restart and rebuild:

   ```bash
   cd /opt/wedding-rsvp
   sudo docker compose restart
   curl http://localhost:3000/api/health
   sudo docker compose up -d --build
   curl http://localhost:3000/api/health
   ```

3. Confirm the household, invited people, responses, and lock still appear in
   `/admin`.
4. Reboot with `sudo reboot`, reconnect, and run:

   ```bash
   cd /opt/wedding-rsvp
   sudo docker compose ps
   curl http://localhost:3000/api/health
   ```

5. Confirm the same household RSVP still appears in `/admin`.

## ⚠️ Data Safety Warning

**NEVER run `docker compose down -v`.**

This command destroys the `postgres_data` Docker named volume and all RSVP data.
There is no automated backup. Data is backed up through Proxmox VM snapshots only.

## Rate Limiting and Proxy Headers

`TRUST_PROXY_HEADERS=true` lets the app use Cloudflare or reverse-proxy IP
headers for basic RSVP and admin-login rate limiting. Only keep this enabled
when the VM is firewalled so direct public traffic cannot spoof those headers.

`NEXT_SERVER_ACTION_ALLOWED_ORIGINS` should include any public Cloudflare or
reverse-proxy hostnames that submit admin/RSVP forms. The app defaults include
`wolfe-wedding.com` and `www.wolfe-wedding.com`.

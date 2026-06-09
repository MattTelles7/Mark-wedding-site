# Deployment

## Target

- Ubuntu or Debian VM
- Installation path: `/opt/wedding-rsvp`
- Public app port: `3000`
- Persistent database: `/opt/wedding-rsvp/data/app.db`

Cloudflare, DNS, TLS, firewall rules, and VM backups are managed separately.

## Branch Model

- `develop` is the active integration and test deployment branch.
- `main` is the stable release branch controlled manually by the project owner.
- Running an installer for a different branch safely switches the VM checkout.

## Install or Update

Develop VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles-7/Mark-wedding-site/develop/install.sh | sudo bash -s -- --branch develop
```

Main VM:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles-7/Mark-wedding-site/main/install.sh | sudo bash -s -- --branch main
```

The same command handles a first install and later updates. It:

1. Installs Git, Docker, Docker Compose, OpenSSL, and supporting packages.
2. Enables and starts Docker through systemd.
3. Clones or safely adopts/updates `/opt/wedding-rsvp`.
4. Checks out only `main` or `develop` and requires a clean fast-forward.
5. Preserves `/opt/wedding-rsvp/data` and `data/app.db`.
6. Preserves `.env`, creating it only when absent.
7. Adds missing `ADMIN_PASSWORD` or `SESSION_SECRET` values without replacing
   the rest of `.env`.
8. Builds the service with `docker compose up -d --build` and reports success
   only after `/api/health` responds.

The admin password is printed only when the installer generates a new value.
The installer never runs `docker compose down -v`, removes Docker volumes,
deletes `data/app.db`, or replaces an existing `.env`.

Keep `SESSION_COOKIE_SECURE=false` while accessing an isolated test VM over
plain HTTP. Set it to `true` before serving the public site over HTTPS; otherwise
the browser will not send the admin session cookie securely.

Database schema migrations run automatically when the app starts. They are
additive and preserve the original `rsvps` table and rows.

When `/opt/wedding-rsvp` is an older non-Git installation, the installer moves
the previous app files to `/opt/wedding-rsvp.pre-git-<timestamp>`, creates a Git
checkout, and moves the existing `.env` and `data` directory into it.

The repository is currently private. Unauthenticated raw-file and clone URLs
cannot access it. The exact one-liners work once the repository is public or
the VM has authenticated GitHub access. The main one-liner additionally
requires the project owner to have manually merged a release into `main`.

## Direct Updates

```bash
sudo /opt/wedding-rsvp/update.sh --branch develop
sudo /opt/wedding-rsvp/update.sh --branch main
```

Omit `--branch` to update the currently checked-out `main` or `develop`
branch. The updater refuses dirty or diverged checkouts, protected files
tracked by the target branch, a missing `.env`, a missing `data` directory, or
a Compose file that does not mount `./data` at `/app/data`.

To move a test VM from `develop` to `main`, run either the main one-liner or:

```bash
sudo /opt/wedding-rsvp/update.sh --branch main
```

## Troubleshooting

```bash
cd /opt/wedding-rsvp
sudo docker compose ps
sudo docker compose logs -f
sudo docker compose restart
sudo systemctl status docker
curl http://localhost:3000
curl http://localhost:3000/api/health
```

The Compose service uses `restart: unless-stopped`, and the installer enables
Docker at boot. Check both:

```bash
sudo systemctl is-enabled docker
sudo systemctl is-active docker
sudo docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' wedding-rsvp
```

## Reboot and Persistence Test

1. Add a recognizable household in `/admin`, open RSVPs, submit its response,
   and confirm the household is locked.
2. Confirm the database exists:

   ```bash
   sudo test -f /opt/wedding-rsvp/data/app.db
   ```

3. Restart and rebuild:

   ```bash
   cd /opt/wedding-rsvp
   sudo docker compose restart
   curl http://localhost:3000/api/health
   sudo docker compose up -d --build
   curl http://localhost:3000/api/health
   ```

4. Confirm the household, invited people, responses, and lock still appear in
   `/admin`.
5. Reboot with `sudo reboot`, reconnect, and run:

   ```bash
   cd /opt/wedding-rsvp
   sudo docker compose ps
   curl http://localhost:3000/api/health
   sudo test -f data/app.db
   ```

6. Confirm the same household RSVP still appears in `/admin`.

## Backup

Back up `/opt/wedding-rsvp/data` regularly at the VM or storage-provider level.
SQLite uses WAL mode, so a backup system that snapshots the entire directory is
preferred. Test restoring the backup before relying on it.

## Rate Limiting and Proxy Headers

`TRUST_PROXY_HEADERS=true` lets the app use Cloudflare or reverse-proxy IP
headers for basic RSVP and admin-login rate limiting. Only keep this enabled
when the VM is firewalled so direct public traffic cannot spoof those headers.

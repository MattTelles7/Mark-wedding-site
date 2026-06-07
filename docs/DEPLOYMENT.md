# Deployment

## Target

- Ubuntu or Debian VM
- Installation path: `/opt/wedding-rsvp`
- Public app port: `3000`
- Persistent database: `/opt/wedding-rsvp/data/app.db`

Cloudflare, DNS, TLS, firewall rules, and VM backups are managed separately.

## First Install

Run:

```bash
curl -fsSL https://raw.githubusercontent.com/MattTelles-7/Mark-wedding-site/main/install.sh | bash
```

The installer:

1. Installs Git, Docker, Docker Compose, OpenSSL, and supporting packages.
2. Clones or updates the repository.
3. Creates the persistent data directory.
4. Creates `.env` and generates missing secrets.
5. Builds and starts the service.

The generated admin password is printed only when it is first created.

The installer configures Docker from Docker's official Ubuntu/Debian package
repository when Docker or the Compose plugin is missing. It also makes
`/opt/wedding-rsvp/data` writable by the non-root container user.

## Updating

```bash
sudo /opt/wedding-rsvp/update.sh
```

This pulls with `--ff-only`, rebuilds the app, restarts the container, and
prunes unused images. It does not remove the `data` directory.

## Useful Commands

```bash
cd /opt/wedding-rsvp
sudo docker compose ps
sudo docker compose logs -f app
sudo docker compose restart app
```

## Backup

Back up `/opt/wedding-rsvp/data` regularly at the VM or storage-provider level.
SQLite uses WAL mode, so a backup system that snapshots the entire directory is
preferred. Test restoring the backup before relying on it.

## Rate Limiting and Proxy Headers

`TRUST_PROXY_HEADERS=true` lets the app use Cloudflare or reverse-proxy IP
headers for basic RSVP and admin-login rate limiting. Only keep this enabled
when the VM is firewalled so direct public traffic cannot spoof those headers.

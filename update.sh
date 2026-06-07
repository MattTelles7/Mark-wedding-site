#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/wedding-rsvp}"

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when update.sh is not run as root." >&2
    exit 1
  fi
  SUDO="sudo"
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "No wedding RSVP installation found at $INSTALL_DIR." >&2
  exit 1
fi

echo "Pulling the latest code..."
$SUDO git -C "$INSTALL_DIR" pull --ff-only

echo "Rebuilding and restarting the application..."
cd "$INSTALL_DIR"
$SUDO docker compose up -d --build

echo "Removing unused Docker images..."
$SUDO docker image prune -f

echo "Update complete. The database in $INSTALL_DIR/data was not removed."

#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/wedding-rsvp}"
REPO_URL="${REPO_URL:-https://github.com/MattTelles-7/Mark-wedding-site.git}"

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when install.sh is not run as root." >&2
    exit 1
  fi
  SUDO="sudo"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This installer supports Ubuntu and Debian systems with apt-get." >&2
  exit 1
fi

echo "Installing required system packages..."
$SUDO apt-get update
$SUDO apt-get install -y ca-certificates curl git gnupg openssl

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  . /etc/os-release
  if [[ "${ID}" != "ubuntu" && "${ID}" != "debian" ]]; then
    echo "This installer only configures Docker's official repository on Ubuntu or Debian." >&2
    exit 1
  fi

  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" \
    | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

  $SUDO apt-get update
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if command -v systemctl >/dev/null 2>&1; then
  $SUDO systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1 && ! $SUDO docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available after installation." >&2
  exit 1
fi

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "Updating existing repository..."
  $SUDO git -C "$INSTALL_DIR" pull --ff-only
elif [[ -e "$INSTALL_DIR" ]]; then
  echo "$INSTALL_DIR exists but is not a Git repository." >&2
  exit 1
else
  echo "Cloning repository..."
  $SUDO git clone "$REPO_URL" "$INSTALL_DIR"
fi

$SUDO mkdir -p "$INSTALL_DIR/data"
$SUDO chown -R 1001:1001 "$INSTALL_DIR/data"

ENV_FILE="$INSTALL_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  $SUDO install -m 600 "$INSTALL_DIR/.env.example" "$ENV_FILE"
fi
$SUDO chmod 600 "$ENV_FILE"

set_env_value() {
  local key="$1"
  local value="$2"
  local current

  current="$($SUDO awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE")"
  if [[ -n "$current" ]]; then
    return
  fi

  if $SUDO grep -q "^${key}=" "$ENV_FILE"; then
    $SUDO sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    $SUDO rm -f "${ENV_FILE}.bak"
  else
    printf '%s=%s\n' "$key" "$value" | $SUDO tee -a "$ENV_FILE" >/dev/null
  fi
}

GENERATED_ADMIN_PASSWORD=""
CURRENT_ADMIN_PASSWORD="$($SUDO awk -F= '$1 == "ADMIN_PASSWORD" {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE")"
if [[ -z "$CURRENT_ADMIN_PASSWORD" ]]; then
  GENERATED_ADMIN_PASSWORD="$(openssl rand -hex 16)"
  set_env_value "ADMIN_PASSWORD" "$GENERATED_ADMIN_PASSWORD"
fi

CURRENT_SESSION_SECRET="$($SUDO awk -F= '$1 == "SESSION_SECRET" {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE")"
if [[ -z "$CURRENT_SESSION_SECRET" ]]; then
  set_env_value "SESSION_SECRET" "$(openssl rand -hex 32)"
fi

echo "Building and starting the application..."
cd "$INSTALL_DIR"
$SUDO docker compose up -d --build

VM_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
VM_IP="${VM_IP:-localhost}"

echo
echo "Wedding RSVP is running at http://${VM_IP}:3000"
if [[ -n "$GENERATED_ADMIN_PASSWORD" ]]; then
  echo "Generated admin password: ${GENERATED_ADMIN_PASSWORD}"
  echo "Store this password now. It will not be printed by future updates."
fi

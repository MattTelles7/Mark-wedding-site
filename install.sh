#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/wedding-rsvp}"
REPO_URL="${REPO_URL:-https://github.com/MattTelles-7/Mark-wedding-site.git}"
BRANCH="main"
INSTALL_MODE="fresh install"

INSTALL_DIR="${INSTALL_DIR%/}"
if [[ -z "$INSTALL_DIR" || "$INSTALL_DIR" == "/" ]]; then
  echo "INSTALL_DIR must not be empty or /." >&2
  exit 2
fi

usage() {
  cat <<'EOF'
Usage: install.sh [--branch main|develop]

Installs or safely updates the wedding RSVP application.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      if [[ $# -lt 2 ]]; then
        echo "--branch requires a value." >&2
        exit 2
      fi
      BRANCH="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$BRANCH" != "main" && "$BRANCH" != "develop" ]]; then
  echo "Branch must be either main or develop." >&2
  exit 2
fi

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when install.sh is not run as root." >&2
    exit 1
  fi
  SUDO=(sudo)
fi

run_git() {
  "${SUDO[@]}" git -C "$INSTALL_DIR" "$@"
}

fetch_branch() {
  run_git fetch --prune origin \
    "+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
}

assert_target_preserves_data() {
  local path

  while IFS= read -r path; do
    case "$path" in
      data)
        echo "Refusing to deploy: origin/$BRANCH tracks protected data path $path." >&2
        exit 1
        ;;
      .env | data/app.db)
        echo "Refusing to deploy: origin/$BRANCH tracks protected file $path." >&2
        exit 1
        ;;
      data/*)
        if [[ "$path" != "data/.gitkeep" ]]; then
          echo "Refusing to deploy: origin/$BRANCH tracks protected data path $path." >&2
          exit 1
        fi
        ;;
    esac
  done < <(run_git ls-tree -r --name-only "origin/$BRANCH" -- .env data)
}

assert_head_preserves_data() {
  local repo_dir="$1"
  local path

  while IFS= read -r path; do
    case "$path" in
      data)
        echo "Refusing to deploy: target branch tracks protected data path $path." >&2
        exit 1
        ;;
      .env | data/app.db)
        echo "Refusing to deploy: target branch tracks protected file $path." >&2
        exit 1
        ;;
      data/*)
        if [[ "$path" != "data/.gitkeep" ]]; then
          echo "Refusing to deploy: target branch tracks protected data path $path." >&2
          exit 1
        fi
        ;;
    esac
  done < <("${SUDO[@]}" git -C "$repo_dir" ls-tree -r --name-only HEAD -- .env data)
}

assert_clean_checkout() {
  local changes
  changes="$(run_git status --porcelain --untracked-files=all)"
  if [[ -n "$changes" ]]; then
    echo "Refusing to update a checkout with local changes or untracked files:" >&2
    printf '%s\n' "$changes" >&2
    exit 1
  fi
}

checkout_requested_branch() {
  fetch_branch
  assert_target_preserves_data
  assert_clean_checkout

  if run_git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    run_git checkout "$BRANCH"
  else
    run_git checkout --track -b "$BRANCH" "origin/$BRANCH"
  fi

  run_git pull --ff-only origin "$BRANCH"

  if [[ "$(run_git rev-parse HEAD)" != "$(run_git rev-parse "origin/$BRANCH")" ]]; then
    echo "Refusing to deploy local commits that are not on origin/$BRANCH." >&2
    exit 1
  fi
}

assert_compose_file_safe() {
  local compose_file="$1"
  if [[ ! -f "$compose_file" ]]; then
    echo "Refusing to deploy without $compose_file." >&2
    exit 1
  fi

  if ! grep -Eq '^[[:space:]]*-[[:space:]]*\.\/data:\/app\/data[[:space:]]*$' "$compose_file"; then
    echo "Refusing to deploy: docker-compose.yml must bind ./data to /app/data." >&2
    exit 1
  fi
}

assert_safe_deployment_layout() {
  assert_compose_file_safe "$INSTALL_DIR/docker-compose.yml"
}

wait_for_app_health() {
  local attempt

  for attempt in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Application did not become healthy at http://127.0.0.1:3000/api/health." >&2
  (
    cd "$INSTALL_DIR"
    "${SUDO[@]}" docker compose ps >&2 || true
    "${SUDO[@]}" docker compose logs --tail=80 app >&2 || true
  )
  exit 1
}

adopt_existing_non_git_install() {
  local backup_dir
  local new_repo_dir
  local temp_dir

  temp_dir="$("${SUDO[@]}" mktemp -d "${INSTALL_DIR}.clone.XXXXXX")"
  new_repo_dir="$temp_dir/repo"
  backup_dir="${INSTALL_DIR}.pre-git-$(date +%Y%m%d%H%M%S)"

  "${SUDO[@]}" git clone --branch "$BRANCH" "$REPO_URL" "$new_repo_dir"
  assert_head_preserves_data "$new_repo_dir"
  assert_compose_file_safe "$new_repo_dir/docker-compose.yml"

  "${SUDO[@]}" mv "$INSTALL_DIR" "$backup_dir"
  "${SUDO[@]}" mv "$new_repo_dir" "$INSTALL_DIR"

  if [[ -f "$backup_dir/.env" ]]; then
    "${SUDO[@]}" mv "$backup_dir/.env" "$INSTALL_DIR/.env"
  fi

  if [[ -d "$backup_dir/data" ]]; then
    if [[ -d "$INSTALL_DIR/data" ]]; then
      "${SUDO[@]}" mv "$INSTALL_DIR/data" "$backup_dir/repository-data-template"
    fi
    "${SUDO[@]}" mv "$backup_dir/data" "$INSTALL_DIR/data"
  fi

  "${SUDO[@]}" rmdir "$temp_dir"

  echo "Previous non-Git app files moved to $backup_dir."
  echo "Existing .env and data directory were moved into the new Git checkout."
}

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This installer supports Ubuntu and Debian systems with apt-get." >&2
  exit 1
fi

echo "Installing required system packages..."
"${SUDO[@]}" apt-get update
"${SUDO[@]}" apt-get install -y ca-certificates curl git gnupg openssl

if ! command -v docker >/dev/null 2>&1 \
  || ! "${SUDO[@]}" docker compose version >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  . /etc/os-release
  if [[ "${ID}" != "ubuntu" && "${ID}" != "debian" ]]; then
    echo "This installer only configures Docker on Ubuntu or Debian." >&2
    exit 1
  fi

  "${SUDO[@]}" install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" \
    | "${SUDO[@]}" gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
  "${SUDO[@]}" chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    | "${SUDO[@]}" tee /etc/apt/sources.list.d/docker.list >/dev/null

  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
fi

if command -v systemctl >/dev/null 2>&1; then
  "${SUDO[@]}" systemctl enable --now docker
fi

if ! "${SUDO[@]}" docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available after installation." >&2
  exit 1
fi

if [[ -d "$INSTALL_DIR/.git" ]]; then
  INSTALL_MODE="update"
  echo "Updating existing repository..."
  checkout_requested_branch
elif [[ -d "$INSTALL_DIR" ]]; then
  INSTALL_MODE="update"
  echo "Migrating existing non-Git installation into a Git checkout..."
  adopt_existing_non_git_install
elif [[ -e "$INSTALL_DIR" ]]; then
  echo "$INSTALL_DIR exists but is not a directory." >&2
  exit 1
else
  echo "Cloning repository branch $BRANCH..."
  "${SUDO[@]}" git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

assert_target_preserves_data
assert_safe_deployment_layout

"${SUDO[@]}" mkdir -p "$INSTALL_DIR/data"
"${SUDO[@]}" chown -R 1001:1001 "$INSTALL_DIR/data"

ENV_FILE="$INSTALL_DIR/.env"
ENV_CREATED=false
if [[ ! -f "$ENV_FILE" ]]; then
  "${SUDO[@]}" install -m 600 "$INSTALL_DIR/.env.example" "$ENV_FILE"
  ENV_CREATED=true
fi
"${SUDO[@]}" chmod 600 "$ENV_FILE"

read_env_value() {
  local key="$1"
  "${SUDO[@]}" awk -F= -v key="$key" \
    '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE"
}

set_env_value() {
  local key="$1"
  local value="$2"

  if "${SUDO[@]}" grep -q "^${key}=" "$ENV_FILE"; then
    "${SUDO[@]}" sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    "${SUDO[@]}" rm -f "${ENV_FILE}.bak"
  else
    printf '%s=%s\n' "$key" "$value" \
      | "${SUDO[@]}" tee -a "$ENV_FILE" >/dev/null
  fi
}

GENERATED_ADMIN_PASSWORD=""
ADMIN_PASSWORD_VALUE="$(read_env_value "ADMIN_PASSWORD")"
if [[ -z "$ADMIN_PASSWORD_VALUE" \
  || ( "$ENV_CREATED" == "true" && "$ADMIN_PASSWORD_VALUE" == "admin" ) ]]; then
  GENERATED_ADMIN_PASSWORD="$(openssl rand -hex 16)"
  set_env_value "ADMIN_PASSWORD" "$GENERATED_ADMIN_PASSWORD"
fi

if [[ -z "$(read_env_value "SESSION_SECRET")" ]]; then
  set_env_value "SESSION_SECRET" "$(openssl rand -hex 32)"
fi

if [[ -n "$GENERATED_ADMIN_PASSWORD" ]]; then
  echo
  echo "Generated admin password: ${GENERATED_ADMIN_PASSWORD}"
  echo "Store this password now. It will not be printed by future updates."
fi

echo "Building and starting the application..."
(
  cd "$INSTALL_DIR"
  "${SUDO[@]}" docker compose up -d --build
)
wait_for_app_health

VM_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
VM_IP="${VM_IP:-localhost}"
COMMIT_HASH="$(run_git rev-parse --short=12 HEAD)"

echo
echo "Install mode: $INSTALL_MODE"
echo "Installed branch: $BRANCH"
echo "Installed commit: $COMMIT_HASH"
echo "Local URL: http://${VM_IP}:3000"
echo "Admin URL: http://${VM_IP}:3000/admin"

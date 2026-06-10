#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/wedding-rsvp}"
BRANCH=""

INSTALL_DIR="${INSTALL_DIR%/}"
if [[ -z "$INSTALL_DIR" || "$INSTALL_DIR" == "/" ]]; then
  echo "INSTALL_DIR must not be empty or /." >&2
  exit 2
fi

usage() {
  cat <<'EOF'
Usage: update.sh [--branch main|develop]

Updates the requested branch. Without --branch, updates the currently checked
out main or develop branch.
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

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when update.sh is not run as root." >&2
    exit 1
  fi
  SUDO=(sudo)
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "No Git-based wedding RSVP installation found at $INSTALL_DIR." >&2
  echo "Run install.sh to install or adopt the existing deployment." >&2
  exit 1
fi

run_git() {
  "${SUDO[@]}" git -C "$INSTALL_DIR" "$@"
}

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(run_git branch --show-current)"
fi

if [[ "$BRANCH" != "main" && "$BRANCH" != "develop" ]]; then
  echo "Branch must be either main or develop." >&2
  exit 2
fi

assert_target_preserves_data() {
  local path

  while IFS= read -r path; do
    case "$path" in
      .env)
        echo "Refusing to update: origin/$BRANCH tracks protected file $path." >&2
        exit 1
        ;;
    esac
  done < <(run_git ls-tree -r --name-only "origin/$BRANCH" -- .env)
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

assert_safe_deployment_layout() {
  local compose_file="$INSTALL_DIR/docker-compose.yml"

  if [[ ! -f "$compose_file" ]]; then
    echo "Refusing to update without $compose_file." >&2
    exit 1
  fi

  if ! grep -q "postgres_data" "$compose_file"; then
    echo "Refusing to update: docker-compose.yml must define the postgres_data volume." >&2
    echo "NEVER run docker compose down -v. Postgres data is sacred." >&2
    exit 1
  fi
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

assert_clean_checkout

echo "Fetching branch $BRANCH..."
run_git fetch --prune origin \
  "+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
assert_target_preserves_data

if run_git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  run_git checkout "$BRANCH"
else
  run_git checkout --track -b "$BRANCH" "origin/$BRANCH"
fi

echo "Pulling branch $BRANCH..."
run_git pull --ff-only origin "$BRANCH"

if [[ "$(run_git rev-parse HEAD)" != "$(run_git rev-parse "origin/$BRANCH")" ]]; then
  echo "Refusing to deploy local commits that are not on origin/$BRANCH." >&2
  exit 1
fi

assert_safe_deployment_layout

if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  echo "Refusing to update because $INSTALL_DIR/.env is missing." >&2
  echo "Run install.sh to safely create missing configuration." >&2
  exit 1
fi

echo "Rebuilding and restarting the application..."
(
  cd "$INSTALL_DIR"
  "${SUDO[@]}" docker compose up -d --build
)
wait_for_app_health

VM_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
VM_IP="${VM_IP:-localhost}"
COMMIT_HASH="$(run_git rev-parse --short=12 HEAD)"

echo
echo "Updated branch: $BRANCH"
echo "Installed commit: $COMMIT_HASH"
echo "Local URL: http://${VM_IP}:3000"
echo "Admin URL: http://${VM_IP}:3000/admin"
echo "Preserved environment: $INSTALL_DIR/.env"
echo "Postgres data is stored in Docker named volume: postgres_data"
echo "NEVER run docker compose down -v. Data lives in that volume."

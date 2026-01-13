
#!/usr/bin/env bash
set -euo pipefail

##############################################
# Environment sanitization (avoid lingering exports)
##############################################
# Set ALLOW_ENV=1 to allow inherited shell exports; default is to ignore them.
ALLOW_ENV="${ALLOW_ENV:-0}"

sanitize_env() {
  if [[ "$ALLOW_ENV" != "1" ]]; then
    # Unset variables that commonly linger from prod or other shells
    for v in BACKEND_PORT FRONTEND_PORT VITE_API_BASE NODE_ENV SERVE_CMD PYTHON_BIN NODE_BIN NPM_BIN; do
      unset "$v" || true
    done
  fi
}
sanitize_env

##############################################
# Dotenv loader (+ overlay .env.development.local)
##############################################
load_env_file() {
  local f="$1"
  if [[ -f "$f" ]]; then
    set -o allexport
    # shellcheck disable=SC1090
    source "$f"
    set +o allexport
    echo "[deploy:dev] Loaded env: $f"
  fi
}

load_dotenv() {
  load_env_file ".env.development"
  load_env_file ".env.development.local"
}

##############################################
# Helpers
##############################################
msg() { echo -e "\033[1;32m[deploy:dev]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1. Please install or add to PATH."
    exit 1
  fi
}

validate_port() {
  local name="$1"; local value="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    err "$name ($value) is not a valid positive integer. Use 0–65535."
    exit 1
  fi
  if (( value < 0 || value > 65535 )); then
    err "$name ($value) out of range. Use 0–65535."
    exit 1
  fi
}

ensure_dir() { mkdir -p "$1"; }

kill_if_running() {
  local name="$1"; local pid_file="$RUN_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid; pid=$(cat "$pid_file" || true)
    if [[ -n "${pid:-}" ]] && ps -p "$pid" >/dev/null 2>&1; then
      msg "Stopping $name (pid $pid)"
      kill "$pid" || true
      local waited=0
      while ps -p "$pid" >/dev/null 2>&1; do
        if (( waited >= 10 )); then
          err "$name (pid $pid) did not exit after 10s"
          break
        fi
        sleep 1
        waited=$((waited + 1))
      done
    fi
    rm -f "$pid_file"
  fi
}

start_bg() {
  local cmd="$1"; local log_file="$2"; local name="$3"; local pid_file="$RUN_DIR/$name.pid"
  msg "Starting $name -> $cmd"
  nohup bash -lc "exec $cmd" >"$log_file" 2>&1 &
  echo $! >"$pid_file"
  sleep 1
  if ps -p "$(cat "$pid_file")" >/dev/null 2>&1; then
    msg "$name started (pid $(cat "$pid_file")), logs: $log_file"
  else
    err "Failed to start $name. Check logs: $log_file"
    exit 1
  fi
}

##############################################
# Configuration defaults FIRST (stable baseline)
##############################################
BACKEND_DIR="${BACKEND_DIR:-backend}"
BACKEND_APP="${BACKEND_APP:-main:app}"
BACKEND_PORT="${BACKEND_PORT:-8113}"

FRONTEND_DIR="${FRONTEND_DIR:-.}"
FRONTEND_PORT="${FRONTEND_PORT:-8114}"
VITE_ROOT="${VITE_ROOT:-$FRONTEND_DIR}"

PYTHON_BIN="${PYTHON_BIN:-python3}"
NODE_BIN="${NODE_BIN:-node}"
NPM_BIN="${NPM_BIN:-npm}"
SERVE_CMD="${SERVE_CMD:-npx --yes serve}"

LOG_DIR="${LOG_DIR:-$HOME/.local/manity-dev/logs}"
VENV_DIR="${VENV_DIR:-$HOME/.local/venvs/manity-dev}"
RUN_DIR="${RUN_DIR:-$HOME/.local/manity-dev/run}"
DATABASE_URL="${DATABASE_URL:-sqlite:////home/c17420g/projects/manity-dev-data/portfolio.db}"
BACKUP_DIR="${BACKUP_DIR:-/home/c17420g/projects/manity-dev-data/backups}"

# Derived defaults (temporary; will recompute after dotenv overlay)
VITE_API_BASE="${VITE_API_BASE:-http://localhost:$BACKEND_PORT}"
NODE_ENV="${NODE_ENV:-development}"

##############################################
# Overlay .env / .env.local AFTER defaults
##############################################
load_dotenv

# Recompute derived values AFTER overlays (so env files can override if desired)
VITE_API_BASE="${VITE_API_BASE:-http://localhost:$BACKEND_PORT}"
NODE_ENV="${NODE_ENV:-development}"

validate_port "BACKEND_PORT" "$BACKEND_PORT"
validate_port "FRONTEND_PORT" "$FRONTEND_PORT"

for cmd in "$PYTHON_BIN" "$NODE_BIN" "$NPM_BIN"; do
  require_cmd "$cmd"
done

[[ -d "$BACKEND_DIR" ]] || { err "Backend directory not found: $BACKEND_DIR"; exit 1; }
[[ -f "$FRONTEND_DIR/package.json" ]] || { err "package.json not found in $FRONTEND_DIR"; exit 1; }
[[ -f "$VITE_ROOT/index.html" ]] || { err "index.html not found in $VITE_ROOT"; exit 1; }

ensure_dir "$LOG_DIR"
ensure_dir "$RUN_DIR"
ensure_dir "$(dirname "$VENV_DIR")"
if [[ "$DATABASE_URL" == sqlite:* ]]; then
  DB_PATH="${DATABASE_URL#sqlite://}"
  case "$DB_PATH" in
    //*) DB_PATH="/${DB_PATH#//}" ;;
  esac
  ensure_dir "$(dirname "$DB_PATH")"
else
  DB_PATH=""
fi
ensure_dir "$BACKUP_DIR"

msg "Configuration:"
for k in BACKEND_DIR BACKEND_APP BACKEND_PORT FRONTEND_DIR FRONTEND_PORT VITE_ROOT DATABASE_URL LOG_DIR VENV_DIR RUN_DIR BACKUP_DIR; do
  v="${!k}"; printf "  %-14s = %s\n" "$k" "$v"
done
printf "  %-14s = %s\n" "VITE_API_BASE" "$VITE_API_BASE"
printf "  %-14s = %s\n" "NODE_ENV" "$NODE_ENV"

##############################################
# Backup database (SQLite only)
##############################################
if [[ -n "${DB_PATH:-}" && -f "$DB_PATH" ]]; then
  timestamp=$(date +"%Y%m%d-%H%M%S")
  db_filename=$(basename "$DB_PATH")
  backup_path="$BACKUP_DIR/${db_filename%.*}-${timestamp}.${db_filename##*.}"
  msg "Backing up database $DB_PATH -> $backup_path"
  cp "$DB_PATH" "$backup_path"
elif [[ -n "${DB_PATH:-}" ]]; then
  err "SQLite database not found at resolved path: $DB_PATH"
  exit 1
else
  msg "DATABASE_URL is not SQLite; skipping backup"
fi

##############################################
# Python venv and backend dependencies
##############################################
msg "Creating/using Python virtual environment: $VENV_DIR"
if [[ ! -d "$VENV_DIR" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

msg "Upgrading pip"
pip install --upgrade pip

if [[ -f "$BACKEND_DIR/requirements.txt" ]]; then
  msg "Installing backend dependencies from requirements.txt"
  pip install -r "$BACKEND_DIR/requirements.txt"
else
  msg "No requirements.txt found. Installing uvicorn and fastapi."
  pip install fastapi uvicorn
fi

##############################################
# Build frontend (explicit dev mode; sanitize env)
##############################################
msg "Installing frontend dependencies"
pushd "$FRONTEND_DIR" >/dev/null
npm ci --include=dev || npm install --include=dev

# Export only the variables we want Vite to see.
# Prefer using .env.development in the repo; this is a safeguard for CI/local.
export NODE_ENV=development
export VITE_API_BASE

msg "Building React app (dev mode)"
# If you add "build:dev": "vite build --mode development" to package.json, use that:
# $NPM_BIN run build:dev
$NPM_BIN run build
popd >/dev/null

##############################################
# Stop previous processes if any
##############################################
kill_if_running "backend"
kill_if_running "frontend"

##############################################
# Start backend (uvicorn) with sanitized environment
##############################################
BACKEND_LOG="$LOG_DIR/backend.log"
BACKEND_CMD="cd \"$BACKEND_DIR\" && \
  env -u BACKEND_PORT -u FRONTEND_PORT -u VITE_API_BASE -u NODE_ENV \
  DATABASE_URL=\"$DATABASE_URL\" \"$VENV_DIR/bin/uvicorn\" \"$BACKEND_APP\" --host 0.0.0.0 --port $BACKEND_PORT"
start_bg "$BACKEND_CMD" "$BACKEND_LOG" "backend"

##############################################
# Start frontend (serve SPA build) with sanitized environment
##############################################
FRONTEND_BUILD_DIR="${FRONTEND_BUILD_DIR:-$FRONTEND_DIR/dist}"
FRONTEND_LOG="$LOG_DIR/frontend.log"

[[ -d "$FRONTEND_BUILD_DIR" ]] || { err "Frontend build directory not found: $FRONTEND_BUILD_DIR"; exit 1; }

FRONTEND_CMD="cd \"$FRONTEND_DIR\" && \
  env -u BACKEND_PORT -u FRONTEND_PORT -u VITE_API_BASE -u NODE_ENV \
  $SERVE_CMD -s \"$FRONTEND_BUILD_DIR\" -l $FRONTEND_PORT"
start_bg "$FRONTEND_CMD" "$FRONTEND_LOG" "frontend"

##############################################
# Summary
##############################################
msg "Dev deployment complete."
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Logs:"
echo "  $BACKEND_LOG"
echo "  $FRONTEND_LOG"

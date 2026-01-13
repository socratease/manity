
#!/usr/bin/env bash
set -euo pipefail

##############################################
# Dotenv loader (+ overlay .env.production.local)
##############################################
load_env_file() {
  local f="$1"
  if [[ -f "$f" ]]; then
    # Export all variables defined in the file (simple VAR=VALUE lines)
    # Note: 'source' allows quotes and escapes commonly used in .env
    set -o allexport
    # shellcheck disable=SC1090
    source "$f"
    set +o allexport
    echo "[deploy] Loaded env: $f"
  fi
}

load_dotenv() {
  # Load base production env, then overlay .env.production.local (if present)
  load_env_file ".env.production"
  load_env_file ".env.production.local"
}

##############################################
# Helpers
##############################################
msg() { echo -e "\033[1;32m[deploy]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1. Please install or add to PATH."
    exit 1
  fi
}

ensure_dir() { mkdir -p "$1"; }

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

validate_path_exists() {
  local kind="$1"; local p="$2"
  if [[ ! -d "$p" ]]; then
    err "$kind directory not found: $p"
    exit 1
  fi
}

mask_env() {
  # Mask values that look sensitive when echoing config
  local k="$1"; local v="$2"
  if [[ "$k" =~ (SECRET|TOKEN|PASS|PWD|KEY|CRED|AUTH|API_KEY) ]]; then
    echo "***"
  else
    echo "$v"
  fi
}

print_config_summary() {
  msg "Configuration:"
  for k in BACKEND_DIR BACKEND_APP BACKEND_PORT FRONTEND_DIR FRONTEND_PORT LOG_DIR VENV_DIR RUN_DIR DATABASE_URL BACKUP_DIR; do
    # shellcheck disable=SC2154
    v="${!k}"
    printf "  %-14s = %s\n" "$k" "$(mask_env "$k" "$v")"
  done
  # Optional frontend variables commonly used by React
  for k in REACT_APP_API_BASE NODE_ENV; do
    v="${!k-}"
    [[ -n "${v:-}" ]] && printf "  %-14s = %s\n" "$k" "$(mask_env "$k" "$v")"
  done
}

kill_if_running() {
  local name="$1"; local pid_file="$RUN_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid; pid=$(cat "$pid_file" || true)
    if [[ -n "${pid:-}" ]] && ps -p "$pid" >/dev/null 2>&1; then
      msg "Stopping $name (pid $pid)"
      kill "$pid" || true
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

find_listening_process() {
  local port="$1"
  local pid=""
  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n1 || true)
  elif command -v ss >/dev/null 2>&1; then
    pid=$(ss -lptn "sport = :$port" 2>/dev/null | awk 'match($0,/pid=([0-9]+)/,m){print m[1]; exit}')
  else
    err "Missing required command: lsof or ss (needed to check port usage)."
    exit 1
  fi

  if [[ -n "$pid" ]]; then
    local cmd=""
    cmd=$(ps -p "$pid" -o command= 2>/dev/null | sed 's/[[:space:]]*$//' || true)
    echo "$pid|$cmd"
    return 0
  fi
  return 1
}

assert_port_free() {
  local name="$1"; local port="$2"
  local info=""
  info=$(find_listening_process "$port" || true)
  if [[ -n "$info" ]]; then
    local pid=""; local cmd=""
    IFS='|' read -r pid cmd <<< "$info"
    err "$name port $port already in use by pid $pid${cmd:+ ($cmd)}."
    msg "Attempting to stop process on port $port (pid $pid)"
    kill "$pid" || true
    sleep 1
    info=$(find_listening_process "$port" || true)
    if [[ -n "$info" ]]; then
      IFS='|' read -r pid cmd <<< "$info"
      err "$name port $port still in use by pid $pid${cmd:+ ($cmd)}. Stop it or change ports."
      exit 1
    fi
    msg "$name port $port is now free."
  fi
}

start_bg() {
  # $1: command string, $2: log file, $3: pid name
  local cmd="$1"; local log_file="$2"; local name="$3"; local pid_file="$RUN_DIR/$name.pid"
  msg "Starting $name -> $cmd"
  nohup bash -lc "$cmd" >"$log_file" 2>&1 &
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
# Load .env before computing defaults
##############################################
load_dotenv

##############################################
# Configuration (env-driven with sane defaults)
##############################################
BACKEND_DIR="${BACKEND_DIR:-backend}"           # path to FastAPI project (has requirements.txt)
BACKEND_APP="${BACKEND_APP:-app.main:app}"      # ASGI path for uvicorn, e.g., "app.main:app"
BACKEND_PORT="${BACKEND_PORT:-8000}"

# Default to production database path unless overridden
DATABASE_URL="${DATABASE_URL:-sqlite:////home/c17420g/projects/manity-data/portfolio.db}"
BACKUP_DIR="${BACKUP_DIR:-/home/c17420g/projects/manity-data/backups}"

FRONTEND_DIR="${FRONTEND_DIR:-frontend}"        # path to React project (has package.json)
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

PYTHON_BIN="${PYTHON_BIN:-python3}"             # python interpreter
NODE_BIN="${NODE_BIN:-node}"                    # node interpreter
NPM_BIN="${NPM_BIN:-npm}"                       # npm
SERVE_CMD="${SERVE_CMD:-npx --yes serve}"       # SPA server via npx (no sudo)

LOG_DIR="${LOG_DIR:-$HOME/.local/app-logs}"
VENV_DIR="${VENV_DIR:-$HOME/.local/venvs/fastapi-react}"
RUN_DIR="${RUN_DIR:-$HOME/.local/app-run}"

# Optional: React API base (picked up by CRA if prefixed REACT_APP_)
REACT_APP_API_BASE="${REACT_APP_API_BASE:-http://localhost:$BACKEND_PORT}"
NODE_ENV="${NODE_ENV:-production}"

##############################################
# Preflight checks & validation
##############################################
require_cmd "$PYTHON_BIN"
require_cmd "$NODE_BIN"
require_cmd "$NPM_BIN"

validate_port "BACKEND_PORT" "$BACKEND_PORT"
validate_port "FRONTEND_PORT" "$FRONTEND_PORT"

validate_path_exists "Backend" "$BACKEND_DIR"
validate_path_exists "Frontend" "$FRONTEND_DIR"

ensure_dir "$LOG_DIR"
ensure_dir "$RUN_DIR"
ensure_dir "$(dirname "$VENV_DIR")"
ensure_dir "$BACKUP_DIR"

# Resolve SQLite path for backups if using SQLite
if [[ "$DATABASE_URL" == sqlite:* ]]; then
  DB_PATH="${DATABASE_URL#sqlite://}"
  case "$DB_PATH" in
    //*) DB_PATH="/${DB_PATH#//}" ;;
  esac
fi

print_config_summary

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
# Build frontend (root has package.json + index.html)
##############################################
msg "Installing frontend dependencies"
pushd "$FRONTEND_DIR" >/dev/null

# Build-time env vars (React/Vite)
export REACT_APP_API_BASE NODE_ENV

# Detect package manager
PKG="npm"
INSTALL_CMD="$NPM_BIN ci --include=dev"   # ensure devDependencies installed
RUN_CMD="$NPM_BIN run"

if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
  PKG="pnpm"
  INSTALL_CMD="pnpm install --dev"
  RUN_CMD="pnpm run"
elif [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1; then
  PKG="yarn"
  INSTALL_CMD="yarn install --frozen-lockfile || yarn install"
  RUN_CMD="yarn"
elif [[ ! -f package-lock.json ]]; then
  # No lockfile → fall back to npm install incl. dev deps
  INSTALL_CMD="$NPM_BIN install --include=dev"
fi

msg "Using package manager: $PKG"

# If npm and an older version that doesn't support --include=dev, fall back via npm_config_production=false
if [[ "$PKG" == "npm" ]]; then
  if ! $INSTALL_CMD >/dev/null 2>&1; then
    msg "npm --include=dev not supported; retrying install with npm_config_production=false"
    npm_config_production=false $NPM_BIN ci || npm_config_production=false $NPM_BIN install
  else
    # rerun to show logs
    bash -lc "$INSTALL_CMD"
  fi
else
  bash -lc "$INSTALL_CMD"
fi

# Sanity: ensure vite is available after install
if [[ ! -x node_modules/.bin/vite ]]; then
  msg "vite not found in node_modules/.bin; adding devDependency"
  if [[ "$PKG" == "pnpm" ]]; then
    pnpm add -D vite @vitejs/plugin-react
  elif [[ "$PKG" == "yarn" ]]; then
    yarn add -D vite @vitejs/plugin-react
  else
    $NPM_BIN i -D vite @vitejs/plugin-react
  fi
fi

# Confirm index.html exists in VITE_ROOT (your case: repo root)
[[ -f "$VITE_ROOT/index.html" ]] || {
  err "Expected index.html at VITE_ROOT=$VITE_ROOT, but not found."
  exit 1
}

# Build (prefer package.json script; otherwise run vite explicitly)
msg "Building React app"
BUILD_SCRIPT="$(node -e 'const p=require("./package.json"); console.log((p.scripts&&p.scripts.build)||"");' || true)"
if [[ -n "$BUILD_SCRIPT" ]]; then
  bash -lc "$RUN_CMD build"
else
  # Fallback: run vite and pass the root explicitly
  if command -v npx >/dev/null 2>&1; then
    npx --yes vite build "$VITE_ROOT"
  else
    node_modules/.bin/vite build "$VITE_ROOT"
  fi
fi

popd >/dev/null


##############################################
# Stop previous processes if any
##############################################
kill_if_running "backend"
kill_if_running "frontend"

##############################################
# Start backend (uvicorn)
##############################################
BACKEND_LOG="$LOG_DIR/backend.log"
BACKEND_CMD="cd \"$BACKEND_DIR\" && DATABASE_URL=\"$DATABASE_URL\" \"$VENV_DIR/bin/uvicorn\" \"$BACKEND_APP\" --host 0.0.0.0 --port $BACKEND_PORT"
assert_port_free "Backend" "$BACKEND_PORT"
start_bg "$BACKEND_CMD" "$BACKEND_LOG" "backend"

##############################################
# Start frontend (serve SPA build)
##############################################
FRONTEND_BUILD_DIR="${FRONTEND_BUILD_DIR:-$FRONTEND_DIR/dist}"  # Vite default
FRONTEND_LOG="$LOG_DIR/frontend.log"

[[ -d "$FRONTEND_BUILD_DIR" ]] || {
  err "Frontend build directory not found: $FRONTEND_BUILD_DIR"
  exit 1
}

FRONTEND_CMD="cd \"$FRONTEND_DIR\" && $SERVE_CMD -s \"$FRONTEND_BUILD_DIR\" -l $FRONTEND_PORT"
assert_port_free "Frontend" "$FRONTEND_PORT"
start_bg "$FRONTEND_CMD" "$FRONTEND_LOG" "frontend"

##############################################
# Summary
##############################################
msg "Deployment complete."
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Logs:"
echo "  $BACKEND_LOG"
echo "  $FRONTEND_LOG"
echo
echo "To stop:"
echo "  kill \$(cat $RUN_DIR/backend.pid); rm -f $RUN_DIR/backend.pid"
echo "  kill \$(cat $RUN_DIR/frontend.pid); rm -f $RUN_DIR/frontend.pid"

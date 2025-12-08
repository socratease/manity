
#!/usr/bin/env bash
set -euo pipefail

##############################################
# Configuration (adjust to your repo layout) #
##############################################
BACKEND_DIR="backend"         # path to FastAPI project (has requirements.txt)
BACKEND_APP="app.main:app"    # ASGI path for uvicorn, e.g., "app.main:app"
BACKEND_PORT="${BACKEND_PORT:-8111}"

FRONTEND_DIR="src"       # path to React project (has package.json)
FRONTEND_PORT="${FRONTEND_PORT:-8112}"

PYTHON_BIN="${PYTHON_BIN:-python3}"  # python interpreter
NODE_BIN="${NODE_BIN:-node}"         # node interpreter
NPM_BIN="${NPM_BIN:-npm}"            # npm
SERVE_CMD="${SERVE_CMD:-npx serve}"  # SPA server (no sudo; uses npx)

LOG_DIR="${LOG_DIR:-$HOME/.local/app-logs}"
VENV_DIR="${VENV_DIR:-$HOME/.local/venvs/fastapi-react}"
RUN_DIR="${RUN_DIR:-$HOME/.local/app-run}"  # pid files, etc.

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

ensure_dir() {
  mkdir -p "$1"
}

kill_if_running() {
  local name="$1"
  local pid_file="$RUN_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file" || true)
    if [[ -n "${pid:-}" ]] && ps -p "$pid" >/dev/null 2>&1; then
      msg "Stopping $name (pid $pid)"
      kill "$pid" || true
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

start_bg() {
  # $1: command (string), $2: log file, $3: pid name
  local cmd="$1"
  local log_file="$2"
  local name="$3"
  local pid_file="$RUN_DIR/$name.pid"

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
# Preflight checks
##############################################
require_cmd "$PYTHON_BIN"
require_cmd "$NODE_BIN"
require_cmd "$NPM_BIN"

if [[ ! -d "$BACKEND_DIR" ]]; then
  err "Backend directory not found: $BACKEND_DIR"
  exit 1
fi
if [[ ! -d "$FRONTEND_DIR" ]]; then
  err "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

ensure_dir "$LOG_DIR"
ensure_dir "$RUN_DIR"

##############################################
# Python venv and backend dependencies
##############################################
msg "Creating Python virtual environment: $VENV_DIR"
ensure_dir "$(dirname "$VENV_DIR")"
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
  msg "No requirements.txt found. Installing uvicorn and fastapi just in case."
  pip install fastapi uvicorn
fi

##############################################
# Build frontend
##############################################
msg "Installing frontend dependencies"
pushd "$FRONTEND_DIR" >/dev/null
# prefer clean, reproducible installs if package-lock.json present
if [[ -f package-lock.json ]]; then
  "$NPM_BIN" ci
else
  "$NPM_BIN" install
fi

msg "Building React app"
"$NPM_BIN" run build
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
BACKEND_CMD="cd \"$BACKEND_DIR\" && \"$VENV_DIR/bin/uvicorn\" \"$BACKEND_APP\" --host 0.0.0.0 --port $BACKEND_PORT"
start_bg "$BACKEND_CMD" "$BACKEND_LOG" "backend"

##############################################
# Start frontend (serve SPA build)
##############################################
FRONTEND_LOG="$LOG_DIR/frontend.log"
FRONTEND_BUILD_DIR="$FRONTEND_DIR/build"

if [[ ! -d "$FRONTEND_BUILD_DIR" ]]; then
  err "Frontend build directory not found: $FRONTEND_BUILD_DIR"
  exit 1
fi

# Use 'serve -s build' to handle SPA routing fallback (no sudo; via npx)
FRONTEND_CMD="cd \"$FRONTEND_DIR\" && $SERVE_CMD -s \"$FRONTEND_BUILD_DIR\" -l $FRONTEND_PORT"
start_bg "$FRONTEND_CMD" "$FRONTEND_LOG" "frontend"

##############################################
# Summary
##############################################
msg "Deployment complete."
echo "Backend: http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Logs:"
echo "  $BACKEND_LOG"
echo "  $FRONTEND_LOG"
echo
echo "To stop:"
echo "  kill \$(cat $RUN_DIR/backend.pid); rm -f $RUN_DIR/backend.pid"
echo "  kill \$(cat $RUN_DIR/frontend.pid); rm -f $RUN_DIR/frontend.pid"

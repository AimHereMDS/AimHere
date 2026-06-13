#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
PID_FILE="$APP_DIR/.aimhere-app.pids"

load_env_file() {
  local line key value

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    key="${line%%=*}"
    value="${line#*=}"
    key="${key//[[:space:]]/}"
    value="${value%$'\r'}"

    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi
      if [[ -z "${!key+x}" ]]; then
        export "$key=$value"
      fi
    fi
  done < "$APP_DIR/.env"
}

if [[ -f "$APP_DIR/.env" ]]; then
  load_env_file
fi

export VITE_API_URL="${VITE_API_URL:-http://localhost:8000}"
export VITE_GOOGLE_MAPS_API_KEY="${VITE_GOOGLE_MAPS_API_KEY:-${GOOGLE_MAPS_API_KEY:-}}"

if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
else
  PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi

if [[ -z "${PYTHON_BIN:-}" ]]; then
  echo "Nu am gasit python. Instaleaza Python sau creeaza backend/.venv."
  exit 1
fi

if ! "$PYTHON_BIN" -c "import uvicorn" >/dev/null 2>&1; then
  echo "Lipseste uvicorn. Ruleaza: cd backend && pip install -r requirements.txt"
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Lipseste frontend/node_modules. Ruleaza: cd frontend && npm install"
  exit 1
fi

PIDS=()

cleanup() {
  if ((${#PIDS[@]} > 0)); then
    echo
    echo "Opresc frontend-ul si backend-ul..."
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
    PIDS=()
  fi
  rm -f "$PID_FILE"
}

stop_app() {
  cleanup
  exit 130
}

trap cleanup EXIT
trap stop_app INT TERM

echo "Pornesc backend-ul pe http://127.0.0.1:8000"
(
  cd "$BACKEND_DIR"
  exec "$PYTHON_BIN" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &
PIDS+=("$!")

echo "Pornesc frontend-ul pe http://127.0.0.1:5173"
(
  cd "$FRONTEND_DIR"
  exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
) &
PIDS+=("$!")

printf "%s\n" "${PIDS[@]}" > "$PID_FILE"

echo
echo "Aplicatia ruleaza. Apasa Ctrl+C ca sa o opresti."

while true; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      wait "$pid"
      exit $?
    fi
  done
  sleep 1
done

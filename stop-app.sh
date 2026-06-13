#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$APP_DIR/.aimhere-app.pids"
PORTS=(8000 5173)
PIDS=()

add_pid() {
  local pid="$1"

  [[ "$pid" =~ ^[0-9]+$ ]] || return 0
  if kill -0 "$pid" >/dev/null 2>&1; then
    case " ${PIDS[*]} " in
      *" $pid "*) ;;
      *) PIDS+=("$pid") ;;
    esac
  fi
}

if [[ -f "$PID_FILE" ]]; then
  while IFS= read -r pid || [[ -n "$pid" ]]; do
    add_pid "$pid"
  done < "$PID_FILE"
fi

if command -v lsof >/dev/null 2>&1; then
  for port in "${PORTS[@]}"; do
    while IFS= read -r pid || [[ -n "$pid" ]]; do
      add_pid "$pid"
    done < <(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  done
fi

if ((${#PIDS[@]} == 0)); then
  rm -f "$PID_FILE"
  echo "Aplicatia nu pare pornita."
  exit 0
fi

echo "Opresc aplicatia..."
kill "${PIDS[@]}" >/dev/null 2>&1 || true

for _ in {1..20}; do
  ALIVE=()
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      ALIVE+=("$pid")
    fi
  done

  if ((${#ALIVE[@]} == 0)); then
    rm -f "$PID_FILE"
    echo "Aplicatia a fost oprita."
    exit 0
  fi

  sleep 0.25
done

kill -9 "${ALIVE[@]}" >/dev/null 2>&1 || true
rm -f "$PID_FILE"
echo "Aplicatia a fost oprita fortat."

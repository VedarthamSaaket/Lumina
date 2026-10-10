#!/bin/zsh
export PATH="/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
export PYTHONUNBUFFERED=1
ROOT="${0:A:h}"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

listening() { lsof -nP -iTCP:$1 -sTCP:LISTEN >/dev/null 2>&1 }

is_lumina_backend() { curl -s -m 2 http://127.0.0.1:8000/health 2>/dev/null | grep -q "Lumina API" }

wait_for() {
  local port=$1 label=$2 tries=0
  until listening $port; do
    tries=$((tries + 1))
    if [ $tries -gt 120 ]; then
      echo "$label did not start. See $LOGS."
      return 1
    fi
    sleep 1
  done
  echo "$label is up on port $port."
}

cleanup() {
  echo
  echo "Stopping Lumina..."
  trap - INT TERM HUP
  if [ -n "$FRONT_PID" ]; then
    pkill -P $FRONT_PID 2>/dev/null
    kill $FRONT_PID 2>/dev/null
    pkill -f "$ROOT/frontend/node_modules/.bin/next" 2>/dev/null
  fi
  [ -n "$BACK_PID" ] && kill $BACK_PID 2>/dev/null
  sleep 2
  pkill -f "llama-server.*$ROOT/backend/models/llm" 2>/dev/null
  exit 0
}
trap cleanup INT TERM HUP

echo "Lumina"
echo "------"

if pg_isready -q -h localhost -p 5432; then
  echo "Database already running."
else
  brew services start postgresql@16 >/dev/null 2>&1
  tries=0
  until pg_isready -q -h localhost -p 5432; do
    tries=$((tries + 1))
    if [ $tries -gt 30 ]; then
      echo "Database did not start. Run: brew services restart postgresql@16"
      exit 1
    fi
    sleep 1
  done
  echo "Database is up on port 5432."
fi

if is_lumina_backend; then
  echo "Backend already running."
elif listening 8000; then
  echo "Port 8000 is in use by another app. Close it and launch Lumina again."
  exit 1
else
  cd "$ROOT/backend"
  .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 > "$LOGS/backend.log" 2>&1 &
  BACK_PID=$!
fi

if listening 3000; then
  echo "Frontend already running."
else
  cd "$ROOT/frontend"
  [ -d node_modules ] || npm install
  npm run dev > "$LOGS/frontend.log" 2>&1 &
  FRONT_PID=$!
fi

wait_for 8000 "Backend" || cleanup
wait_for 3000 "Frontend" || cleanup

[ -z "$LUMINA_NO_OPEN" ] && open "http://localhost:3000/"
echo
echo "Lumina is running at http://localhost:3000"
echo "Keep this window open. Press Ctrl+C or close it to stop everything."

while true; do
  sleep 3600 &
  wait $!
done

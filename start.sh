#!/bin/bash
# SigmaSpend startup script

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND="$REPO/backend"
FRONTEND="$REPO/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Kill anything already on these ports
lsof -ti tcp:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti tcp:$FRONTEND_PORT | xargs kill -9 2>/dev/null

# Open Terminal with two tabs
osascript \
  -e 'tell application "Terminal"' \
  -e "  do script \"cd '$BACKEND' && make run-prod\"" \
  -e "  do script \"cd '$FRONTEND' && npm run dev\"" \
  -e '  activate' \
  -e 'end tell'

# Wait for frontend to be ready, then open browser
(
  for i in $(seq 1 30); do
    sleep 1
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
      open "http://localhost:$FRONTEND_PORT"
      exit 0
    fi
  done
  # Fallback: open after 15s regardless
  open "http://localhost:$FRONTEND_PORT"
) &

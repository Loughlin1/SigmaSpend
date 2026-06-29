#!/bin/bash
# SigmaSpend startup script

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND="$REPO/backend"
FRONTEND="$REPO/frontend"
LOGS="$REPO/run_logs"
PID_FILE="/tmp/sigmaspend.pid"
BACKEND_PORT=8100
FRONTEND_PORT=8101

# Stop any previously tracked SigmaSpend processes
if [[ -f "$PID_FILE" ]]; then
    while read -r pid; do
        kill "$pid" 2>/dev/null
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    sleep 1
fi

# Check ports are free before starting — warn if something else is using them
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null)
    if [[ -n "$EXISTING_PID" ]]; then
        echo "Error: Port $PORT is already in use by PID $EXISTING_PID."
        echo "Stop that process first or choose a different port."
        exit 1
    fi
done

mkdir -p "$LOGS"

echo "Building frontend..."
cd "$FRONTEND" && npm run build

echo "Starting backend..."
cd "$BACKEND" && make run-prod >> "$LOGS/backend.log" 2>&1 &
echo $! >> "$PID_FILE"

echo "Starting frontend..."
cd "$FRONTEND" && npm run preview >> "$LOGS/frontend.log" 2>&1 &
echo $! >> "$PID_FILE"

echo "SigmaSpend started. Logs in $LOGS/"

# Wait for frontend to be ready, then open browser
for i in $(seq 1 30); do
    sleep 1
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        open "http://localhost:$FRONTEND_PORT"
        exit 0
    fi
done
open "http://localhost:$FRONTEND_PORT"

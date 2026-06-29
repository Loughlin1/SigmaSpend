#!/bin/bash
# SigmaSpend startup script
set +m  # suppress job control notifications

REPO="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND="$REPO/backend"
FRONTEND="$REPO/frontend"
LOGS="$REPO/run_logs"
BACKEND_PORT=8100
FRONTEND_PORT=8101

export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
NPM="$(which npm)"

# Check ports are free before starting
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null)
    if [[ -n "$EXISTING_PID" ]]; then
        echo "Error: Port $PORT is already in use by PID $EXISTING_PID."
        echo "Run sigmaspend-stop first."
        exit 1
    fi
done

mkdir -p "$LOGS"

echo "Building frontend..."
(cd "$FRONTEND" && "$NPM" run build)

echo "Starting backend..."
(cd "$BACKEND" && make run-prod >> "$LOGS/backend.log" 2>&1) &

echo "Starting frontend..."
(cd "$FRONTEND" && "$NPM" run preview >> "$LOGS/frontend.log" 2>&1) &

echo "SigmaSpend started. Logs in $LOGS/"

# Wait for frontend to be ready, then open browser
(
    for i in $(seq 1 30); do
        sleep 1
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            open "http://localhost:$FRONTEND_PORT"
            exit 0
        fi
    done
    open "http://localhost:$FRONTEND_PORT"
) &

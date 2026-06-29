#!/bin/bash
# SigmaSpend shutdown script

BACKEND_PORT=8100
FRONTEND_PORT=8101

echo "Stopping SigmaSpend..."

for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    PIDS=$(lsof -ti tcp:$PORT 2>/dev/null)
    if [[ -n "$PIDS" ]]; then
        echo "$PIDS" | xargs kill -9 2>/dev/null && echo "  Stopped processes on port $PORT." || echo "  Error: Could not stop processes on port $PORT."
    else
        echo "  Port $PORT is already free."
    fi
done

echo "SigmaSpend stopped."

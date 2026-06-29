#!/bin/bash
# SigmaSpend shutdown script

PID_FILE="/tmp/sigmaspend.pid"
BACKEND_PORT=8100
FRONTEND_PORT=8101

echo "Stopping SigmaSpend..."

if [[ ! -f "$PID_FILE" ]]; then
    echo "No SigmaSpend processes found."
    exit 0
fi

# Collect our PIDs
SIGMASPEND_PIDS=()
while read -r pid; do
    SIGMASPEND_PIDS+=("$pid")
    kill "$pid" 2>/dev/null
done < "$PID_FILE"

sleep 1

# Force-kill only if the process still running on the port is one we own
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    REMAINING_PID=$(lsof -ti tcp:$PORT 2>/dev/null)
    if [[ -n "$REMAINING_PID" ]]; then
        for OUR_PID in "${SIGMASPEND_PIDS[@]}"; do
            if [[ "$REMAINING_PID" == "$OUR_PID" ]]; then
                kill -9 "$REMAINING_PID" 2>/dev/null
            fi
        done
    fi
done

rm -f "$PID_FILE"
echo "SigmaSpend stopped."

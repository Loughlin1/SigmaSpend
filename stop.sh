#!/bin/bash
# SigmaSpend shutdown script

BACKEND_PORT=8000
FRONTEND_PORT=5173

echo "Stopping SigmaSpend..."

# Kill processes on both ports
lsof -ti tcp:$BACKEND_PORT | xargs kill -SIGTERM 2>/dev/null
lsof -ti tcp:$FRONTEND_PORT | xargs kill -SIGTERM 2>/dev/null

sleep 1

# Force-kill anything still running
lsof -ti tcp:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti tcp:$FRONTEND_PORT | xargs kill -9 2>/dev/null

echo "SigmaSpend stopped."

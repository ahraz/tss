#!/usr/bin/env bash
# Start TailShare PC receiver server
# Run this once, keep it running in background

VENV_DIR="/tmp/tailshare-venv"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create venv if needed
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install flask
fi

# Kill existing instance
pkill -f "python.*server.py" 2>/dev/null

# Start server
nohup "$VENV_DIR/bin/python" "$SCRIPT_DIR/server.py" > /tmp/tailshare-server.log 2>&1 &
echo "TailShare server started (PID $!)"
echo "Server log: /tmp/tailshare-server.log"
echo "Verify: curl http://$(tailscale ip -4):7800/"

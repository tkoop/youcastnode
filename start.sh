#!/bin/bash
# Check if tmux is installed
if ! command -v tmux &> /dev/null
then
    echo "tmux could not be found, please install it: sudo apt install tmux"
    exit
fi

# Kill existing session if it exists
tmux kill-session -t youcast 2>/dev/null

# Try to find Node.js via fnm if not in PATH (common for cron/reboot)
if ! command -v node &> /dev/null; then
    if [ -d "$HOME/.local/share/fnm" ]; then
        export PATH="$HOME/.local/share/fnm:$PATH"
        eval "$(fnm env --shell bash)"
    fi
fi

# Fallback to a common Node.js path if still not found
NODE_CMD="node"
if ! command -v node &> /dev/null; then
    # Search for any fnm-installed node version as a last resort
    FNM_NODE=$(find "$HOME/.local/share/fnm/node-versions" -name node -type f -executable | head -n 1)
    if [ -n "$FNM_NODE" ]; then
        NODE_CMD="$FNM_NODE"
    fi
fi

# Start a new detached session
tmux new-session -d -s youcast "bash -c 'cd \"$(dirname \"$0\")\" && $NODE_CMD src/index.js > output.log 2>&1'"

echo "YouCastNode started in tmux session 'youcast'"
echo "To view logs: tail -f output.log"
echo "To attach to session: tmux attach -t youcast"

#!/bin/bash
# Check if tmux is installed
if ! command -v tmux &> /dev/null
then
    echo "tmux could not be found, please install it: sudo apt install tmux"
    exit
fi

# Kill existing session if it exists
tmux kill-session -t youcast 2>/dev/null

# Start a new detached session
NODE_BIN="/home/koop/.local/share/fnm/node-versions/v26.3.0/installation/bin/node"
tmux new-session -d -s youcast "bash -c 'cd \"$(dirname \"$0\")\" && $NODE_BIN src/index.js > output.log 2>&1'"

echo "YouCastNode started in tmux session 'youcast'"
echo "To view logs: tail -f output.log"
echo "To attach to session: tmux attach -t youcast"

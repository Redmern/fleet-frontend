#!/usr/bin/env bash
# Starts the recorder in an isolated fleet: its own config (FLEET_CONFIG_HOME) and its own
# fleetd socket (XDG_RUNTIME_DIR), so a fleet you already run is not touched. Claude Code
# uses your normal login. Git commits in the demo are authored as "fleet demo".
#
#   bash env.sh <demo-root> <workdir>
set -euo pipefail
root="$1"; work="$2"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$root/config" "$root/run"; chmod 700 "$root/run"
exec env -u FLEET_ENDPOINT -u FLEET_PANE -u FLEET_PANE_TOKEN -u FLEET_REMOTE_DAEMON -u FLEET_MUX \
    -u FLEET_EXECUTABLE -u NVIM -u MYVIMRC -u NVIM_APPNAME -u NVIM_LOG_FILE -u TMUX \
    FLEET_CONFIG_HOME="$root/config" XDG_RUNTIME_DIR="$root/run" \
    GIT_AUTHOR_NAME="fleet demo" GIT_AUTHOR_EMAIL=demo@example.com \
    GIT_COMMITTER_NAME="fleet demo" GIT_COMMITTER_EMAIL=demo@example.com \
    TERM=xterm-256color COLORTERM=truecolor LANG=C.UTF-8 PS1='$ ' HISTFILE=/dev/null \
    DEMO_CWD="$root" "${PYTHON:-python3}" "$here/drive.py" "$work"

#!/usr/bin/env bash
# Starts a Claude Code session with the sprite-session workflow.
# Usage: ./start-session.sh

cd "$(dirname "$0")" || exit 1

exec claude --prompt "Invoke the sprite-session skill to start a new coding session."

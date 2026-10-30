#!/usr/bin/env bash
# Runs at the start of every Claude Code session (.claude/settings.json, SessionStart hook).
# Cloud sessions (Claude app on the phone, claude.ai/code) start on a fresh machine, so this installs
# what scripts/build_blog.py needs. On a laptop it does nothing.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
python3 -c 'import sys, markdown; sys.exit(markdown.__version__ != "3.9")' 2>/dev/null && exit 0
pip install --quiet markdown==3.9 || pip install --quiet --user --break-system-packages markdown==3.9
exit 0

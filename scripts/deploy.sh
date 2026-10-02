#!/usr/bin/env bash
# Deploy groundapp.live. Refuses to ship anything that looks private.
set -euo pipefail
cd "$(dirname "$0")/.."

bad=$(find site -type f \( -name '*.py' -o -name '*.log' -o -name '*.csv' -o -name '*.env' -o -name 'CLAUDE*' \
  -o -name '*send-log*' -o -name '.dev.vars' \) -print)
bad_json=$(find site -type f -name '*.json' ! -path 'site/assets/lottie/*' -print)
bad_dirs=$(find site -type d \( -name marketing -o -name substack -o -name private \) -print)
if [[ -n "$bad$bad_json$bad_dirs" ]]; then
  echo "Refusing to deploy. These look private:"; echo "$bad$bad_json$bad_dirs"; exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Uncommitted changes. Commit and push first so GitHub matches what goes live."; exit 1
fi

npx wrangler pages deploy --project-name groundapp --branch main --commit-hash "$(git rev-parse HEAD)" --commit-message "$(git log -1 --pretty=%s)"

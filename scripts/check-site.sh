#!/usr/bin/env bash
# Refuses to let anything that looks private reach groundapp.live.
# Runs on every push in .github/workflows/deploy.yml, and is safe to run locally.
set -euo pipefail
cd "$(dirname "$0")/.."

bad=$(find site -type f \( -name '*.py' -o -name '*.log' -o -name '*.csv' -o -name '*.env' -o -name 'CLAUDE*' -o -name 'AGENTS*' \
  -o -name '*send-log*' -o -name '.dev.vars' \) -print)
bad_json=$(find site -type f -name '*.json' ! -path 'site/assets/lottie/*' -print)
bad_dirs=$(find site -type d \( -name marketing -o -name substack -o -name private \) -print)
if [[ -n "$bad$bad_json$bad_dirs" ]]; then
  echo "Refusing to deploy. These look private:"; echo "$bad$bad_json$bad_dirs"; exit 1
fi
echo "site/ looks clean."

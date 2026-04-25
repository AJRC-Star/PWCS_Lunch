#!/bin/bash
# Weekly menu fetch — runs on your Mac in place of the GitHub Actions schedule.
# Install: see scripts/com.pwcs-lunch.fetch-menu.plist

set -euo pipefail

# Extend PATH to cover Homebrew (Intel and Apple Silicon) and the official
# Node installer location so npx/git are found when launchd runs this script
# with a minimal environment.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Load nvm if present (handles nvm-managed Node installs)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
fi

PROJECT="$HOME/PWCS_Lunch"
LOG_DIR="$PROJECT/logs"
mkdir -p "$LOG_DIR"

echo "=== Menu fetch started $(date -u +'%Y-%m-%d %H:%M:%S UTC') ==="

cd "$PROJECT"

git pull origin main

npx tsx scripts/fetch-menu.ts

if git diff --quiet public/menu-data.json; then
  echo "No changes to menu data — skipping commit."
else
  FETCH_TIME=$(date -u +'%Y-%m-%d %H:%M:%S UTC')
  git add public/menu-data.json
  git commit -m "Update menu data via local schedule - $FETCH_TIME"
  git push origin main
  echo "✓ Menu data updated and pushed."
fi

echo "=== Done $(date -u +'%Y-%m-%d %H:%M:%S UTC') ==="

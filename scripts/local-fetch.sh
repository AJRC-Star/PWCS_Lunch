#!/bin/bash
# Weekly menu fetch — runs on your Mac in place of the GitHub Actions schedule.
# Install: see scripts/com.pwcs-lunch.fetch-menu.plist

set -euo pipefail

# Extend PATH to cover Homebrew (Intel and Apple Silicon) and the official
# Node installer location so npx/git are found when launchd runs this script
# with a minimal environment.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# Load nvm if present (handles nvm-managed Node installs)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT/logs"
mkdir -p "$LOG_DIR"

echo "=== Menu fetch started $(date -u +'%Y-%m-%d %H:%M:%S UTC') ==="

cd "$PROJECT"

CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Refusing to refresh menu data from branch '$CURRENT_BRANCH'; expected main."
  exit 1
fi

STASHED_LOCAL_CHANGES=0
restore_local_changes() {
  if [ "$STASHED_LOCAL_CHANGES" -eq 1 ]; then
    echo "Restoring local worktree changes."
    if ! git stash pop --index --quiet; then
      echo "Failed to restore local changes cleanly; inspect the remaining stash and working tree."
      git status --short
      exit 1
    fi
  fi
}
trap restore_local_changes EXIT

if [ -n "$(git status --porcelain --untracked-files=normal -- public/menu-data.json)" ]; then
  echo "Refusing to refresh menu data because public/menu-data.json already has local changes."
  git status --short -- public/menu-data.json
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo "Stashing unrelated local worktree changes before refreshing menu data."
  git status --short
  git stash push --include-untracked -m "local-fetch autostash $(date -u +'%Y-%m-%d %H:%M:%S UTC')" --quiet
  STASHED_LOCAL_CHANGES=1
fi

git pull --ff-only origin main

npx tsx scripts/fetch-menu.ts
npm run validate:artifact

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

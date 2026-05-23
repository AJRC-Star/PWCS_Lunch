#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

REMOTE="$TMP_DIR/origin.git"
WORK="$TMP_DIR/work"
BIN="$TMP_DIR/bin"
LOG="$TMP_DIR/local-fetch.log"

mkdir -p "$BIN"
git init --bare "$REMOTE" >/dev/null
git clone "$REMOTE" "$WORK" >/dev/null 2>&1

cd "$WORK"
git checkout -b main >/dev/null 2>&1
git config user.email "test@example.com"
git config user.name "Test User"
mkdir -p scripts public docs
cp "$ROOT/scripts/local-fetch.sh" scripts/local-fetch.sh
printf '{"ok":true}\n' > public/menu-data.json
printf 'original\n' > docs/local-notes.md
git add .
git commit -m "Initial" >/dev/null
git push -u origin main >/dev/null 2>&1

cat > "$BIN/npx" <<'STUB'
#!/bin/bash
exit 0
STUB
cat > "$BIN/npm" <<'STUB'
#!/bin/bash
if [ "$1" = "run" ] && [ "$2" = "validate:artifact" ]; then
  exit 0
fi
exit 1
STUB
chmod +x "$BIN/npx" "$BIN/npm"

printf 'local edit\n' >> docs/local-notes.md
PATH="$BIN:$PATH" bash scripts/local-fetch.sh >"$LOG" 2>&1

if ! grep -q "local edit" docs/local-notes.md; then
  echo "Expected unrelated local edit to be restored after refresh."
  cat "$LOG"
  exit 1
fi

if [ -n "$(git status --porcelain -- public/menu-data.json)" ]; then
  echo "Expected menu artifact to stay clean when fetch produced no changes."
  cat "$LOG"
  exit 1
fi

echo "local-fetch preserves unrelated dirty worktree changes"

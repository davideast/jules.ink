#!/usr/bin/env bash
set -euo pipefail

API_PORT=13010
UI_PORT=14330
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cleanup() {
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    wait "$PID" 2>/dev/null || true
  fi
  if [[ -d "$ROOT_DIR/ui/src.bak" ]]; then
    rm -rf "$ROOT_DIR/ui/src"
    mv "$ROOT_DIR/ui/src.bak" "$ROOT_DIR/ui/src"
  fi
}
trap cleanup EXIT

step() {
  echo ""
  echo "==> $1"
  echo ""
}

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

cd "$ROOT_DIR"

# ── 1. Build ────────────────────────────────────────────────
step "Building TypeScript"
npm run build

step "Building Astro UI"
npm run build:ui

# ── 2. Integration test (dev mode) ─────────────────────────
step "Running integration test (dev mode)"
npx vitest run tests/ui.int.test.ts

# ── 3. Pack dry-run ─────────────────────────────────────────
step "Checking npm pack contents"
PACK_OUTPUT=$(npm pack --dry-run 2>&1)

if echo "$PACK_OUTPUT" | grep -q "ui/dist/"; then
  echo "  ui/dist/ is included"
else
  fail "ui/dist/ missing from pack output"
fi

if echo "$PACK_OUTPUT" | grep -q "ui/src/"; then
  fail "ui/src/ should not be in pack output"
else
  echo "  ui/src/ is excluded"
fi

# ── 4. Production smoke test ───────────────────────────────
step "Production smoke test (ui/src removed)"
mv ui/src ui/src.bak

node dist/cli.js ui --api-port "$API_PORT" --ui-port "$UI_PORT" &
PID=$!
sleep 10

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/" || echo "000")
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$UI_PORT/" || echo "000")

kill "$PID" 2>/dev/null
wait "$PID" 2>/dev/null || true
unset PID

mv ui/src.bak ui/src

if [[ "$UI_STATUS" != "200" ]]; then
  fail "UI server returned $UI_STATUS, expected 200"
fi
echo "  API status: $API_STATUS (404 expected — no route at /)"
echo "  UI  status: $UI_STATUS"

# ── Done ────────────────────────────────────────────────────
step "All checks passed. Safe to run: npm publish"

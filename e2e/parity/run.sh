#!/usr/bin/env bash
# Runs the web parity suite (spec §12A) inside the pinned Playwright image, against the local
# Supabase stack. The app server (Next build + start, or the Expo static server) and the
# Supabase fault proxy run inside the container too, started by Playwright's webServer.
#
#   e2e/parity/run.sh                     compare against baseline/ and axe-baseline.json
#   e2e/parity/run.sh --update            re-capture baseline/ and axe-baseline.json
#   e2e/parity/run.sh --project=flows     any other args go to `playwright test`
#
# Env: PARITY_TARGET=next|expo (default next), PARITY_EXPO_DIR (expo), PARITY_SKIP_BUILD=1
# (reuse apps/web/.next), PARITY_WORKERS, SUPABASE_CLI (default `supabase`), DOCKER (default
# `sudo -n docker`).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
DOCKER="${DOCKER:-sudo -n docker}"
SUPABASE_CLI="${SUPABASE_CLI:-supabase}"

# The image must match the installed @playwright/test exactly (same Chromium build, same fonts).
PW_VERSION="$(sed -n 's/.*"@playwright\/test": "\([^"]*\)".*/\1/p' "$HERE/package.json")"
INSTALLED="$(sed -n 's/^ *"version": "\([^"]*\)".*/\1/p' "$ROOT/node_modules/@playwright/test/package.json" 2>/dev/null | head -1)"
if [[ "$INSTALLED" != "$PW_VERSION" ]]; then
  echo "run.sh: @playwright/test $PW_VERSION is pinned but ${INSTALLED:-nothing} is installed; run pnpm install" >&2
  exit 1
fi
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"

pw_args=()
axe_mode="${PARITY_AXE:-compare}"
for arg in "$@"; do
  if [[ "$arg" == "--update" ]]; then
    pw_args+=("--update-snapshots=all")
    axe_mode="record"
  else
    pw_args+=("$arg")
  fi
done

# Local stack only: URL, DB and publishable key come from `supabase status` at runtime.
# (`status` exits non-zero while optional services such as edge-runtime are stopped, so the
# parsed values decide.)
status_env="$(cd "$ROOT/supabase" && bash -c "$SUPABASE_CLI status -o env" </dev/null 2>/dev/null || true)"
read_status() { sed -n "s/^$1=\"\(.*\)\"$/\1/p" <<<"$status_env"; }
API_URL="$(read_status API_URL)"
DB_URL="$(read_status DB_URL)"
PUBLISHABLE_KEY="$(read_status PUBLISHABLE_KEY)"
MAILPIT_URL="$(read_status MAILPIT_URL)"
if [[ -z "$API_URL" || -z "$PUBLISHABLE_KEY" ]]; then
  echo "run.sh: \`$SUPABASE_CLI status\` gave no API_URL/PUBLISHABLE_KEY; start the local stack (supabase start)" >&2
  exit 1
fi
if [[ ! "$API_URL" =~ ^http://(127\.0\.0\.1|localhost): || ! "$DB_URL" =~ @(127\.0\.0\.1|localhost): ]]; then
  echo "run.sh: refusing to run against a non-local stack ($API_URL)" >&2
  exit 1
fi

mounts=(-v "$ROOT:$ROOT")
if [[ -n "${PARITY_EXPO_DIR:-}" ]]; then
  PARITY_EXPO_DIR="$(cd "$PARITY_EXPO_DIR" && pwd)"
  mounts+=(-v "$PARITY_EXPO_DIR:$PARITY_EXPO_DIR:ro")
fi

echo "run.sh: $IMAGE, target=${PARITY_TARGET:-next}, axe=$axe_mode"
set +e
$DOCKER run --rm --network host --ipc host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e TZ=Europe/Copenhagen \
  -e PARITY_TARGET="${PARITY_TARGET:-next}" \
  -e PARITY_EXPO_DIR="${PARITY_EXPO_DIR:-}" \
  -e PARITY_SKIP_BUILD="${PARITY_SKIP_BUILD:-}" \
  -e PARITY_WORKERS="${PARITY_WORKERS:-4}" \
  -e PARITY_AXE="$axe_mode" \
  -e PARITY_SUPABASE_URL="$API_URL" \
  -e PARITY_DB_URL="$DB_URL" \
  -e PARITY_MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:54324}" \
  -e PARITY_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  "${mounts[@]}" -w "$HERE" "$IMAGE" \
  node "$ROOT/node_modules/@playwright/test/cli.js" test "${pw_args[@]}"
code=$?
set -e

# The container runs as the calling user, but hand back anything that ended up root-owned.
$DOCKER run --rm -v "$ROOT:$ROOT" "$IMAGE" \
  chown -R "$(id -u):$(id -g)" "$HERE" "$ROOT/apps/web/.next" 2>/dev/null || true
exit $code

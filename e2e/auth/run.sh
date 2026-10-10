#!/usr/bin/env bash
# Auth flows (spec §9.2–9.5) against the Expo web export, the local Supabase stack and its Mailpit
# inbox. Not part of the parity suite: nothing here compares against apps/web. Runs inside the
# pinned Playwright image, like e2e/parity/run.sh, on its own port so it can run beside it.
#
#   e2e/auth/run.sh                      the auth flows
#   AUTH_SHOTS_DIR=/path e2e/auth/run.sh --project=shots
#                                        login and code-step screenshots for design review
#
# Env: AUTH_E2E_SKIP_BUILD=1 (reuse apps/native/dist-auth-e2e), SUPABASE_CLI (default `supabase`),
# DOCKER (default `docker`, or `sudo -n docker`). Local stack only.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
if [[ -z "${DOCKER:-}" ]]; then
  if docker info >/dev/null 2>&1; then
    DOCKER="docker"
  elif sudo -n docker info >/dev/null 2>&1; then
    DOCKER="sudo -n docker"
  else
    echo "run.sh: can't reach Docker with \`docker\` or \`sudo -n docker\`; set DOCKER=..." >&2
    exit 1
  fi
fi
SUPABASE_CLI="${SUPABASE_CLI:-supabase}"

# Same pinned image as the parity suite.
PW_VERSION="$(sed -n 's/.*"@playwright\/test": "\([^"]*\)".*/\1/p' "$ROOT/e2e/parity/package.json")"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"

status_env="$(cd "$ROOT/supabase" && bash -c "$SUPABASE_CLI status -o env" </dev/null 2>/dev/null || true)"
read_status() { sed -n "s/^$1=\"\(.*\)\"$/\1/p" <<<"$status_env"; }
API_URL="$(read_status API_URL)"
PUBLISHABLE_KEY="$(read_status PUBLISHABLE_KEY)"
SECRET_KEY="$(read_status SECRET_KEY)"
[[ -n "$SECRET_KEY" ]] || SECRET_KEY="$(read_status SERVICE_ROLE_KEY)"
MAILPIT_URL="$(read_status MAILPIT_URL)"
if [[ -z "$API_URL" || -z "$PUBLISHABLE_KEY" || -z "$SECRET_KEY" ]]; then
  echo "run.sh: \`$SUPABASE_CLI status\` gave no API_URL/keys; start the local stack (supabase start)" >&2
  exit 1
fi
if [[ ! "$API_URL" =~ ^http://(127\.0\.0\.1|localhost): ]]; then
  echo "run.sh: refusing to run against a non-local stack ($API_URL)" >&2
  exit 1
fi

# The app talks to the stack directly (no parity fault proxy).
OUT="$ROOT/apps/native/dist-auth-e2e"
if [[ -z "${AUTH_E2E_SKIP_BUILD:-}" ]]; then
  EXPO_PUBLIC_SUPABASE_URL="$API_URL" EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
    PARITY_EXPO_OUT="$OUT" SUPABASE_CLI="$SUPABASE_CLI" "$ROOT/e2e/parity/build-expo.sh"
fi

mounts=(-v "$ROOT:$ROOT")
if [[ -n "${AUTH_SHOTS_DIR:-}" ]]; then
  mkdir -p "$AUTH_SHOTS_DIR"
  AUTH_SHOTS_DIR="$(cd "$AUTH_SHOTS_DIR" && pwd)"
  mounts+=(-v "$AUTH_SHOTS_DIR:$AUTH_SHOTS_DIR")
fi

set +e
$DOCKER run --rm --network host --ipc host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e AUTH_E2E_DIR="$OUT" \
  -e AUTH_E2E_SUPABASE_URL="$API_URL" \
  -e AUTH_E2E_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  -e AUTH_E2E_SECRET_KEY="$SECRET_KEY" \
  -e AUTH_E2E_MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:54324}" \
  -e AUTH_SHOTS_DIR="${AUTH_SHOTS_DIR:-}" \
  "${mounts[@]}" -w "$HERE" "$IMAGE" \
  node "$ROOT/node_modules/@playwright/test/cli.js" test "$@"
code=$?
set -e
exit $code

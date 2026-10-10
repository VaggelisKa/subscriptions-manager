#!/usr/bin/env bash
# Builds the Expo web app for PARITY_TARGET=expo: `expo export -p web` into apps/native/dist-parity,
# with the Supabase URL and publishable key baked in for the local stack. Like apps/web's
# .next-parity, the output is gitignored and never deployed.
#
#   e2e/parity/build-expo.sh
#
# Env: EXPO_PUBLIC_SUPABASE_URL (default: the parity fault proxy, http://127.0.0.1:$PARITY_PROXY_PORT),
# EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (default: from `supabase status`), SUPABASE_CLI (default
# `supabase`), PARITY_EXPO_OUT (default apps/native/dist-parity; e2e/auth uses its own). Fails
# unless the URL's host is localhost or 127.0.0.1.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
NATIVE="$ROOT/apps/native"
OUT="${PARITY_EXPO_OUT:-$NATIVE/dist-parity}"
SUPABASE_CLI="${SUPABASE_CLI:-supabase}"
# The directory is wiped first: only ever a dist-* directory in apps/native.
if [[ "$OUT" != "$NATIVE"/dist-* || "$OUT" == */../* ]]; then
  echo "build-expo.sh: PARITY_EXPO_OUT must be $NATIVE/dist-<name> ($OUT)" >&2
  exit 1
fi

# The app talks to Supabase through support/supabase-proxy.mjs (support/env.ts, PROXY_URL).
URL="${EXPO_PUBLIC_SUPABASE_URL:-http://127.0.0.1:${PARITY_PROXY_PORT:-54399}}"
if [[ ! "$URL" =~ ^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?(/.*)?$ ]]; then
  echo "build-expo.sh: refusing to build against a non-local Supabase URL ($URL)" >&2
  exit 1
fi

KEY="${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"
if [[ -z "$KEY" ]]; then
  status_env="$(cd "$ROOT/supabase" && bash -c "$SUPABASE_CLI status -o env" </dev/null 2>/dev/null || true)"
  KEY="$(sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p' <<<"$status_env")"
fi
if [[ -z "$KEY" ]]; then
  echo "build-expo.sh: no publishable key; start the local stack (supabase start) or set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" >&2
  exit 1
fi

echo "build-expo.sh: expo export -p web → $OUT (Supabase $URL)"
rm -rf "$OUT"
# Set explicitly so nothing from an apps/native/.env file (a hosted project) is used; --clear so
# Metro doesn't reuse a bundle with other inlined EXPO_PUBLIC_* values.
(cd "$NATIVE" && EXPO_PUBLIC_SUPABASE_URL="$URL" EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$KEY" \
  EXPO_PUBLIC_SUPABASE_ANON_KEY="$KEY" EXPO_NO_TELEMETRY=1 \
  npx expo export -p web --output-dir "$OUT" --clear)

# The URL that got inlined is the one checked above, and no hosted project made it in.
if ! grep -rqF "$URL" "$OUT/_expo/static/js/web"; then
  echo "build-expo.sh: $URL not found in the bundle" >&2
  exit 1
fi
if grep -rqE "https://[a-z0-9]+\.supabase\.co" "$OUT/_expo/static/js/web"; then
  echo "build-expo.sh: the bundle references a hosted Supabase project" >&2
  exit 1
fi

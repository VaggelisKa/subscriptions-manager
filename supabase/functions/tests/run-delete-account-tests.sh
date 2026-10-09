#!/usr/bin/env bash
# Runs the delete-account Deno tests against the local stack (`supabase start` must be running).
# Two passes, each behind its own `supabase functions serve` (see delete-account.test.ts):
#   gateway        config.toml settings (verify_jwt = true) and the local sb_secret_… key
#   admin-failure  --no-verify-jwt and the publishable key as SB_SECRET_KEY
# `functions serve` replaces the stack's edge runtime container while it runs and removes it on exit.
# Overrides: SUPABASE (CLI command), DOCKER (docker command), DENO, EXTRA_FUNCTIONS_ENV (file whose
# lines are appended to the generated serve env file).
set -euo pipefail

cd "$(dirname "$0")/../../.."
SUPABASE=${SUPABASE:-supabase}
DOCKER=${DOCKER:-docker}
DENO=${DENO:-deno}
ALLOWED_ORIGIN=http://allowed.test
project_id=$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml)

umask 077
tmp=$(mktemp -d)
serve_pid=""
edge_url="" # set by serve: the edge runtime container's delete-account URL, if reachable
stop_serve() {
  if [[ -n $serve_pid ]]; then
    kill -INT "$serve_pid" 2>/dev/null || true
    wait "$serve_pid" 2>/dev/null || true
    serve_pid=""
  fi
}
trap 'stop_serve; rm -rf "$tmp"' EXIT

# API_URL, SECRET_KEY, PUBLISHABLE_KEY, JWT_SECRET; read at runtime, never written to the repo.
eval "$($SUPABASE status -o env 2>/dev/null </dev/null | grep -E '^(API_URL|SECRET_KEY|PUBLISHABLE_KEY|JWT_SECRET)=')"

serve() { # serve <SB_SECRET_KEY> [extra serve flags...]
  printf 'SB_SECRET_KEY=%s\nALLOWED_ORIGINS=%s\n' "$1" "$ALLOWED_ORIGIN" >"$tmp/functions.env"
  [[ -n ${EXTRA_FUNCTIONS_ENV:-} ]] && cat "$EXTRA_FUNCTIONS_ENV" >>"$tmp/functions.env"
  $SUPABASE functions serve --env-file "$tmp/functions.env" "${@:2}" </dev/null >"$tmp/serve.log" 2>&1 &
  serve_pid=$!
  # Within the same 60 s, also find the edge runtime container's own address (the CORS tests skip
  # the gateway). Its IP is only assigned once serve has replaced the container, so keep retrying.
  local serving="" edge_ip
  edge_url=""
  for _ in $(seq 1 60); do
    [[ -z $serving ]] && grep -q "Serving functions" "$tmp/serve.log" && serving=1
    if [[ -z $edge_url ]]; then
      edge_ip=$($DOCKER inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{"\n"}}{{end}}' \
        "supabase_edge_runtime_$project_id" 2>/dev/null | grep -m1 . || true)
      if [[ -n $edge_ip ]] &&
        curl -s -o /dev/null --max-time 3 -X OPTIONS "http://$edge_ip:8081/delete-account"; then
        edge_url="http://$edge_ip:8081/delete-account"
      fi
    fi
    [[ -n $serving && -n $edge_url ]] && return 0
    sleep 1
  done
  [[ -n $serving ]] && return 0
  cat "$tmp/serve.log" >&2
  return 1
}

run_pass() { # run_pass <mode>
  if [[ $1 == gateway && -z $edge_url ]]; then
    echo "edge runtime not reachable directly; the gateway pass needs it for the CORS tests" >&2
    return 1
  fi
  DELETE_ACCOUNT_TEST_MODE=$1 SUPABASE_URL=$API_URL SB_SECRET_KEY=$SECRET_KEY \
    SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY JWT_SECRET=$JWT_SECRET \
    ALLOWED_ORIGIN=$ALLOWED_ORIGIN EDGE_RUNTIME_URL=$edge_url \
    "$DENO" test --allow-net --allow-env --no-lock supabase/functions/tests/delete-account.test.ts
}

status=0
"$DENO" test --allow-env --no-lock supabase/functions/tests/cors.test.ts \
  supabase/functions/tests/recent-auth.test.ts || status=1

echo "── pass 1: gateway (verify_jwt = true, secret key) ──"
serve "$SECRET_KEY"
run_pass gateway || status=1
stop_serve

echo "── pass 2: admin-failure (--no-verify-jwt, publishable key as SB_SECRET_KEY) ──"
serve "$PUBLISHABLE_KEY" --no-verify-jwt
run_pass admin-failure || status=1
stop_serve

exit $status

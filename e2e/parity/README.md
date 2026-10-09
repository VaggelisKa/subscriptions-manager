# Web parity suite

The baseline for spec §12A: what the Next app in `apps/web` looks like (`baseline/`), what it
does (`FLOWS.md`, `tests/flows/`) and its accessibility (`axe-baseline.json`). The Expo web
app must match it before Phase 6. Test-only: nothing here ships.

**Next UI freeze:** from Phase 1e until Phase 6, `apps/web` takes no visual changes except
bug fixes. A fix that changes pixels re-captures the affected shots (`run.sh --update`) in the
same PR, labelled `parity-baseline-change` and reviewed.

## Run

Prerequisites: Docker with host networking (on macOS: Docker Desktop 4.34+ with host networking
enabled in Settings → Resources → Network), `pnpm install`, and the local Supabase stack running (`supabase start`
from `supabase/`). The suite only ever talks to the local stack. `run.sh` reads its URL, DB URL
and publishable key from `supabase status` and refuses anything that isn't on 127.0.0.1.

```sh
e2e/parity/run.sh                       # compare with baseline/ and axe-baseline.json
e2e/parity/run.sh --update              # re-capture baseline/ and axe-baseline.json
e2e/parity/run.sh --project=flows       # extra args go to `playwright test`
SUPABASE_CLI="npx supabase" e2e/parity/run.sh   # if the CLI isn't on PATH as `supabase`
DOCKER="sudo docker" e2e/parity/run.sh          # default: `docker`, else `sudo -n docker`
```

- Everything runs in `mcr.microsoft.com/playwright:v<@playwright/test version>-noble` with
  `--network host` and `TZ=Europe/Copenhagen`, as the calling user. The Next server runs inside
  that container too, started by Playwright's `webServer`. `next build` uses
  `NEXT_PUBLIC_SUPABASE_URL` = the fault proxy, and the build is skipped with
  `PARITY_SKIP_BUILD=1`. The build goes to `apps/web/.next-parity` (`NEXT_DIST_DIR`), so it never
  replaces the regular `.next` build. `next start` listens on 127.0.0.1:3210 (`PARITY_PORT`).
- `PARITY_TARGET=expo PARITY_EXPO_DIR=<expo export -p web output>` serves that directory instead
  and compares it against the same baseline. Never use `--update` for it.
- Report: `e2e/parity/playwright-report/` (expected / actual / diff for failed shots).
- Thresholds: `toHaveScreenshot({ threshold: 0.2, maxDiffPixelRatio: 0.005 })`. Per-screen
  overrides go in `thresholds.ts` only, with a reason and an entry in `APPROVED_DIFFS.md`, capped at 2%.
- axe: WCAG 2.1 A/AA on every captured state. `PARITY_AXE=compare` (the default) fails when a
  state has a rule that `axe-baseline.json` doesn't list for it, or more failing nodes for a rule
  than recorded. Nodes are counted rather than matched by selector, because axe's selectors shift
  with unrelated DOM. `--update` records the file again.

## How it stays deterministic

- **Data:** `seed.sql` (fixed UUIDs, a known local-only password) is applied by globalSetup on
  every run, idempotently. Write flows reseed only their own user. You can also load it by hand:
  `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f e2e/parity/seed.sql`.
- **Clock:** the browser uses `page.clock.setFixedTime("2026-10-14T10:00:00+02:00")`. The Next
  server computes "today" during SSR too (`lib/billing.ts` `today()` → `new Date()`), so
  `next start` preloads `support/fake-clock.cjs`. That makes the server's wall clock (`new Date()`)
  start at the same instant and tick from there. `Date.now()` stays real, because Supabase token
  expiry is checked with it and GoTrue issues tokens on the real clock. Every test fails on a
  React hydration error, which is what a server on a different day produces. The suite was also
  re-run with the server's real clock moved by libfaketime (20 Sep 2026; 15 Jan 2026 23:50), and
  every shot matched.
- **Auth:** globalSetup signs each fixture user in once (password, supabase-js). That stays well
  under GoTrue's limit of 30 sign-ins per 5 min. `loginAs()` writes the session into the
  `@supabase/ssr` cookie (`sb-127-auth-token`, `base64-` + base64url JSON, chunked). Its `expires_at`
  is moved past the fixed date so nothing refreshes it. For `expo` it writes localStorage instead
  (a stub until that app exists).
- **Loading / error states:** the home page loads on the server, out of reach of `page.route`.
  The app is therefore built against `support/supabase-proxy.mjs`, a transparent proxy to the local
  stack that can hold or fail one user's REST requests per test.
- **Rendering:** `deviceScaleFactor: 1`, `reducedMotion: "reduce"`, locale `en-DK` (what
  `lib/format.ts` formats with), animations disabled, caret hidden, fonts and images loaded,
  pointer parked in a corner.

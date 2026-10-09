// Preloaded into `next start` (NODE_OPTIONS=--require …) so the server agrees with the
// browser's `page.clock.setFixedTime` about what "today" is. The app computes today on the
// server too: packages/shared/src/billing.ts `today()` → `new Date()`, rendered during SSR by
// the day strip, timeline buckets, monthly summary, ledger, calendar and detail.
//
// What's faked: the wall clock the app reads, i.e. `new Date()` and `Date()` with no
// arguments. Like libfaketime's "@" mode it starts at PARITY_FIXED_TIME and then ticks, so a
// run (minutes) stays on the fixed day whatever the real date is.
//
// What stays real: `Date.now()` (and performance.now / hrtime). supabase-js checks token
// expiry with `Date.now()` (auth-js `validateExp`, session `expires_at`), and GoTrue issues
// tokens on the real clock, so faking it makes the proxy's `getClaims()` throw
// "JWT has expired" (a 500). Next's timers and caches use it too. The app itself never reads
// `Date.now()` on a rendered path (checked: apps/web/src, packages/shared).
"use strict";

const fixed = Date.parse(process.env.PARITY_FIXED_TIME || "");
if (Number.isNaN(fixed)) {
  throw new Error("fake-clock: PARITY_FIXED_TIME must be an ISO timestamp");
}

const RealDate = Date;
const offset = fixed - RealDate.now();

function fakeNow() {
  return RealDate.now() + offset;
}

function FakeDate(...args) {
  if (!new.target) return new RealDate(fakeNow()).toString();
  return args.length === 0 ? new RealDate(fakeNow()) : new RealDate(...args);
}
Object.setPrototypeOf(FakeDate, RealDate); // Date.now, Date.parse, Date.UTC stay real
Object.defineProperty(FakeDate, "prototype", { value: RealDate.prototype }); // instanceof Date

globalThis.Date = FakeDate;

if (process.env.PARITY_FAKE_CLOCK_LOG) {
  console.log(`[fake-clock] pid ${process.pid}: real ${new RealDate(RealDate.now()).toISOString()} → new Date() ${new FakeDate().toISOString()}`);
}

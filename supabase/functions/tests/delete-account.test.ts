// delete-account against the local stack (spec §14.2). Run via ./run-delete-account-tests.sh, which
// serves the function twice and sets DELETE_ACCOUNT_TEST_MODE:
//   gateway        verify_jwt = true (config.toml) and the real local secret key.
//   admin-failure  --no-verify-jwt and SB_SECRET_KEY = the publishable key, so every token reaches the
//                  function's own checks and the Admin API delete fails.
// Env: SUPABASE_URL, SB_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY, JWT_SECRET (all from `supabase status -o env`),
// ALLOWED_ORIGIN (listed in the served ALLOWED_ORIGINS), EDGE_RUNTIME_URL (the edge runtime without Kong,
// whose CORS plugin rewrites Access-Control-Allow-Origin locally; required by the gateway CORS tests).
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1.0.19";
import { createClient } from "npm:@supabase/supabase-js@2.97.0";

const MODE = Deno.env.get("DELETE_ACCOUNT_TEST_MODE") ?? "gateway";
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SECRET_KEY = requireEnv("SB_SECRET_KEY");
const PUBLISHABLE_KEY = requireEnv("SUPABASE_PUBLISHABLE_KEY");
const JWT_SECRET = requireEnv("JWT_SECRET");
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "http://allowed.test";
const EDGE_RUNTIME_URL = Deno.env.get("EDGE_RUNTIME_URL");
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/delete-account`;
const PASSWORD = "delete-account-test-Pw1!";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set (run supabase/functions/tests/run-delete-account-tests.sh)`);
  return value;
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(SUPABASE_URL, SECRET_KEY, clientOptions);

type TestUser = { id: string; email: string; token: string };

async function createUser(subscriptionNames: string[] = []): Promise<TestUser> {
  const email = `delete-account-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, clientOptions);
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  const token = signIn.session.access_token;

  if (subscriptionNames.length) {
    const asUser = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      ...clientOptions,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { error: insertError } = await asUser.from("subscriptions").insert(
      subscriptionNames.map((name) => ({ name, price: 9.99, interval: "month", billed_at: new Date().toISOString() })),
    );
    if (insertError) throw insertError;
  }
  return { id: data.user.id, email, token };
}

async function removeUser(user: TestUser) {
  await admin.auth.admin.deleteUser(user.id); // already gone after a successful delete; ignore the error
}

async function userExists(id: string) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  return !error && data.user?.id === id;
}

async function subscriptionIds(userId: string) {
  const { data, error } = await admin.from("subscriptions").select("id").eq("user_id", userId).order("id");
  if (error) throw error;
  return data.map((row) => row.id as string);
}

// ── JWT helpers ──
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encodeJson = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

function decodePayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
}

/** Re-signs a real access token's claims with HS256, which local Auth still accepts (legacy JWT secret). */
async function signHs256(payload: Record<string, unknown>, secret = JWT_SECRET) {
  const input = `${encodeJson({ alg: "HS256", typ: "JWT" })}.${encodeJson(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input)));
  return `${input}.${b64url(signature)}`;
}

/** Same session and user, but the last sign-in was `ageSeconds` ago with `method`. */
function tokenSignedInAgo(user: TestUser, ageSeconds: number, method = "password") {
  const timestamp = Math.floor(Date.now() / 1000) - ageSeconds;
  return signHs256({ ...decodePayload(user.token), amr: [{ method, timestamp }] });
}

// ── Calling the function ──
async function call(
  token: string | null,
  init: { method?: string; origin?: string; url?: string } = {},
) {
  const headers: Record<string, string> = { apikey: PUBLISHABLE_KEY };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  if (init.origin) headers.Origin = init.origin;
  const res = await fetch(init.url ?? FUNCTION_URL, { method: init.method ?? "POST", headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // non-JSON (preflight "ok")
  }
  return { status: res.status, headers: res.headers, body };
}

const malformedTokens = (user: TestUser) => ({
  abc: "abc",
  "truncated JWT": user.token.slice(0, Math.floor(user.token.length / 2)),
  "bad base64": "eyJ!!!.%%%%.@@@",
  "three empty segments": "..",
});

const gatewayTest = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name: `[gateway] ${name}`, ignore: MODE !== "gateway", fn });
const failureTest = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name: `[admin-failure] ${name}`, ignore: MODE !== "admin-failure", fn });

// ── gateway: verify_jwt = true and a working Admin API ──

gatewayTest("no token → 401", async () => {
  const res = await call(null);
  assertEquals(res.status, 401);
});

gatewayTest("bogus and unparseable tokens → 401, never 500", async () => {
  const user = await createUser();
  try {
    const forged = await signHs256(decodePayload(user.token), "not-the-jwt-secret-not-the-jwt-secret");
    for (const [label, token] of Object.entries({ ...malformedTokens(user), "forged signature": forged })) {
      const res = await call(token);
      assertEquals(res.status, 401, label);
    }
    assert(await userExists(user.id));
  } finally {
    await removeUser(user);
  }
});

gatewayTest("non-POST → 405", async () => {
  const user = await createUser();
  try {
    for (const method of ["GET", "PUT", "DELETE"]) {
      const res = await call(user.token, { method });
      assertEquals(res.status, 405, method);
      assertEquals(res.body, { code: "method_not_allowed" }, method);
    }
    assert(await userExists(user.id));
  } finally {
    await removeUser(user);
  }
});

gatewayTest("valid token from a sign-in older than 10 minutes → 401 reauth_required", async () => {
  const user = await createUser(["Old sign-in sub"]);
  try {
    const res = await call(await tokenSignedInAgo(user, 11 * 60));
    assertEquals(res.status, 401);
    assertEquals(res.body, { code: "reauth_required" });
    assert(await userExists(user.id));
    assertEquals((await subscriptionIds(user.id)).length, 1);
  } finally {
    await removeUser(user);
  }
});

gatewayTest("fresh sign-in by a method other than password/otp → 401 reauth_required", async () => {
  const user = await createUser(["Kept"]);
  try {
    for (const method of ["oauth", "recovery", "invite"]) {
      const res = await call(await tokenSignedInAgo(user, 5, method));
      assertEquals(res.status, 401, method);
      assertEquals(res.body, { code: "reauth_required" }, method);
    }
    const mixed = await signHs256({
      ...decodePayload(user.token),
      amr: [
        { method: "oauth", timestamp: Math.floor(Date.now() / 1000) - 5 },
        { method: "password", timestamp: Math.floor(Date.now() / 1000) - 11 * 60 },
      ],
    });
    const res = await call(mixed);
    assertEquals(res.status, 401, "fresh oauth + stale password");
    assertEquals(res.body, { code: "reauth_required" }, "fresh oauth + stale password");
    assert(await userExists(user.id));
    assertEquals((await subscriptionIds(user.id)).length, 1);
  } finally {
    await removeUser(user);
  }
});

gatewayTest("amr without numeric timestamps → 401, never treated as recent", async () => {
  const user = await createUser();
  try {
    const cases: [unknown, string][] = [
      [["pwd"], "reauth_required"], // RFC 8176 string form
      [[{ method: "password" }], "reauth_required"],
      [[], "reauth_required"],
      [[{ method: "password", timestamp: "now" }], "unauthorized"], // Auth itself rejects this token
    ];
    for (const [amr, code] of cases) {
      const res = await call(await signHs256({ ...decodePayload(user.token), amr }));
      assertEquals(res.status, 401, JSON.stringify(amr));
      assertEquals(res.body, { code }, JSON.stringify(amr));
    }
    assert(await userExists(user.id));
  } finally {
    await removeUser(user);
  }
});

gatewayTest("re-signed fresh otp sign-in → 200", async () => {
  const user = await createUser(["Otp sub"]);
  try {
    const res = await call(await tokenSignedInAgo(user, 5, "otp"));
    assertEquals(res.status, 200);
    assertEquals(res.body, { success: true });
    assertFalse(await userExists(user.id));
  } finally {
    await removeUser(user);
  }
});

gatewayTest("fresh password token → 200; user and their subscriptions gone, other user untouched", async () => {
  const target = await createUser(["Target A", "Target B"]);
  const other = await createUser(["Other A", "Other B", "Other C"]);
  try {
    assertEquals((await subscriptionIds(target.id)).length, 2);
    const otherBefore = await subscriptionIds(other.id);
    assertEquals(otherBefore.length, 3);

    const res = await call(target.token);
    assertEquals(res.status, 200);
    assertEquals(res.body, { success: true });

    assertFalse(await userExists(target.id));
    assertEquals(await subscriptionIds(target.id), []);
    assert(await userExists(other.id));
    assertEquals(await subscriptionIds(other.id), otherBefore);

    // The deleted user's still-unexpired token no longer works.
    const again = await call(target.token);
    assertEquals(again.status, 401);
    assertEquals(again.body, { code: "unauthorized" });
  } finally {
    await removeUser(target);
    await removeUser(other);
  }
});

// CORS: Kong's local CORS plugin overwrites Access-Control-Allow-Origin with "*", so these talk to the
// edge runtime directly. The JWT gate still applies there (verify_jwt = true).
const corsTest = (name: string, fn: () => Promise<void>) =>
  Deno.test({
    name: `[gateway] CORS: ${name}`,
    ignore: MODE !== "gateway",
    fn: () => {
      if (!EDGE_RUNTIME_URL) throw new Error("EDGE_RUNTIME_URL is not set: the CORS tests can't reach the edge runtime");
      return fn();
    },
  });

corsTest("OPTIONS preflight from an allowed origin echoes it", async () => {
  const res = await call(null, { method: "OPTIONS", origin: ALLOWED_ORIGIN, url: EDGE_RUNTIME_URL });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);
  assertEquals(res.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  assert(res.headers.get("access-control-allow-headers")?.includes("authorization"));
  assert(res.headers.get("vary")?.includes("Origin"));
});

corsTest("OPTIONS preflight from a disallowed origin gets no ACAO header", async () => {
  const res = await call(null, { method: "OPTIONS", origin: "https://evil.example", url: EDGE_RUNTIME_URL });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), null);
  assertEquals(res.headers.get("access-control-allow-methods"), null);
});

corsTest("POST responses echo only allowed origins", async () => {
  const user = await createUser();
  try {
    const token = await tokenSignedInAgo(user, 11 * 60); // reaches the function without deleting anything
    const allowed = await call(token, { origin: ALLOWED_ORIGIN, url: EDGE_RUNTIME_URL });
    assertEquals(allowed.body, { code: "reauth_required" });
    assertEquals(allowed.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);

    for (const origin of ["https://evil.example", `${ALLOWED_ORIGIN}.evil.example`, "null"]) {
      const denied = await call(token, { origin, url: EDGE_RUNTIME_URL });
      assertEquals(denied.body, { code: "reauth_required" }, origin);
      assertEquals(denied.headers.get("access-control-allow-origin"), null, origin);
    }
    const native = await call(token, { url: EDGE_RUNTIME_URL }); // no Origin, like the native apps
    assertEquals(native.headers.get("access-control-allow-origin"), null);
  } finally {
    await removeUser(user);
  }
});

// ── admin-failure: --no-verify-jwt, and SB_SECRET_KEY is not an admin key ──

failureTest("missing or unparseable tokens are rejected by the function itself → 401 unauthorized", async () => {
  const user = await createUser();
  try {
    assertEquals((await call(null)).body, { code: "unauthorized" });
    assertEquals((await call("")).body, { code: "unauthorized" });
    const forged = await signHs256(decodePayload(user.token), "not-the-jwt-secret-not-the-jwt-secret");
    for (const [label, token] of Object.entries({ ...malformedTokens(user), "forged signature": forged })) {
      const res = await call(token);
      assertEquals(res.status, 401, label);
      assertEquals(res.body, { code: "unauthorized" }, label);
    }
    assert(await userExists(user.id));
  } finally {
    await removeUser(user);
  }
});

failureTest("stale or non-password/otp sign-in is still checked before the Admin API → 401 reauth_required", async () => {
  const user = await createUser();
  try {
    for (const [age, method] of [[11 * 60, "password"], [5, "oauth"], [5, "recovery"]] as const) {
      const res = await call(await tokenSignedInAgo(user, age, method));
      assertEquals(res.status, 401, method);
      assertEquals(res.body, { code: "reauth_required" }, method);
    }
  } finally {
    await removeUser(user);
  }
});

failureTest("Admin API error → 500 delete_failed with no detail; nothing deleted", async () => {
  const user = await createUser(["Kept A", "Kept B"]);
  try {
    // A genuine fresh token and a sign-in 9 minutes ago both pass the recency check and hit the Admin API.
    for (const token of [user.token, await tokenSignedInAgo(user, 9 * 60)]) {
      const res = await call(token);
      assertEquals(res.status, 500);
      assertEquals(res.body, { code: "delete_failed" });
      assertEquals(res.headers.get("content-type"), "application/json");
    }
    assert(await userExists(user.id));
    assertEquals((await subscriptionIds(user.id)).length, 2);
  } finally {
    await removeUser(user);
  }
});

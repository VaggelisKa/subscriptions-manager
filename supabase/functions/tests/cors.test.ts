// Unit tests for _shared/cors.ts (no stack needed). ALLOWED_ORIGINS is read at module load.
import { assertEquals } from "jsr:@std/assert@1.0.19";

Deno.env.set("ALLOWED_ORIGINS", " https://app.example.com , http://localhost:8081,");
const { corsHeaders, preflight } = await import("../_shared/cors.ts");

const request = (method: string, origin?: string) =>
  new Request("http://localhost/delete-account", { method, headers: origin ? { Origin: origin } : {} });

Deno.test("cors: allowed origins are echoed (list is trimmed)", () => {
  for (const origin of ["https://app.example.com", "http://localhost:8081"]) {
    const headers = corsHeaders(request("POST", origin));
    assertEquals(headers["Access-Control-Allow-Origin"], origin);
    assertEquals(headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
    assertEquals(headers["Vary"], "Origin");
  }
});

Deno.test("cors: other origins, near misses and no Origin get only Vary", () => {
  for (const origin of [undefined, "https://evil.example", "https://app.example.com.evil.example",
    "http://app.example.com", "https://APP.example.com", "null", ""]) {
    assertEquals(corsHeaders(request("POST", origin)), { Vary: "Origin" }, String(origin));
  }
});

Deno.test("cors: preflight answers OPTIONS only", async () => {
  const res = preflight(request("OPTIONS", "https://app.example.com"));
  assertEquals(res?.status, 200);
  assertEquals(await res?.text(), "ok");
  assertEquals(res?.headers.get("Access-Control-Allow-Origin"), "https://app.example.com");
  assertEquals(preflight(request("POST", "https://app.example.com")), null);
});

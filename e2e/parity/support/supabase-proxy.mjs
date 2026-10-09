// Transparent HTTP/WebSocket proxy between the app and the local Supabase stack, so tests can
// make one user's requests slow or failing. The home page loads its data on the server, out of
// reach of `page.route`; the app is built against this proxy's URL instead (see run.sh).
//
//   POST   /__parity/faults  {"userId", "path", "mode": "hold" | "error"}  add a rule → {"id"}
//   DELETE /__parity/faults?id=…                                         drop one rule
//   GET    /__parity/health
//
// A rule matches requests whose path contains `path` and whose bearer JWT has `sub === userId`.
// Rules are per user, so tests for other users never see them, and per test (by id), so tests
// sharing a user (the same state in several projects) don't lift each other's faults. A held
// request continues once no "hold" rule matches it any more.
//
// Usage: node supabase-proxy.mjs  (env PARITY_PROXY_PORT, PARITY_SUPABASE_URL)

import http from "node:http";
import net from "node:net";

const port = Number(process.env.PARITY_PROXY_PORT ?? 54399);
const upstream = new URL(process.env.PARITY_SUPABASE_URL ?? "http://127.0.0.1:54321");

/** @type {{ id: number, userId: string, path: string, mode: "hold" | "error" }[]} */
let rules = [];
let nextId = 1;
/** Requests parked by a "hold" rule: { sub, url, resume }. */
let held = [];

function matchingRule(sub, url) {
  return sub && rules.find((r) => r.userId === sub && url?.includes(r.path));
}

function subject(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).sub ?? null;
  } catch {
    return null;
  }
}

function forward(req, res) {
  const proxied = http.request(
    {
      host: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: upstream.host },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  proxied.on("error", (error) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: `parity proxy: ${error.message}` }));
  });
  req.pipe(proxied);
}

function control(req, res) {
  const url = new URL(req.url ?? "/", "http://proxy");
  const reply = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/__parity/health") return reply(200, { ok: true, rules: rules.length, held: held.length });
  if (url.pathname !== "/__parity/faults") return reply(404, { message: "unknown control path" });

  if (req.method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    rules = rules.filter((r) => r.id !== id);
    const release = held.filter((h) => matchingRule(h.sub, h.url)?.mode !== "hold");
    held = held.filter((h) => !release.includes(h));
    release.forEach((h) => h.resume());
    return reply(200, { released: release.length });
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const rule = JSON.parse(body);
        if (!rule.userId || !rule.path || !["hold", "error"].includes(rule.mode)) throw new Error("bad rule");
        const id = nextId++;
        rules.push({ id, userId: rule.userId, path: rule.path, mode: rule.mode });
        reply(201, { id });
      } catch (error) {
        reply(400, { message: String(error) });
      }
    });
    return;
  }
  reply(405, { message: "method not allowed" });
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/__parity/")) return control(req, res);

  const sub = subject(req);
  const rule = matchingRule(sub, req.url);
  if (!rule) return forward(req, res);

  if (rule.mode === "error") {
    // PostgREST's error shape, so supabase-js reports it as a query error.
    res.writeHead(500, { "content-type": "application/json" });
    return res.end(JSON.stringify({ code: "PARITY", message: "parity proxy: injected failure", details: null, hint: null }));
  }
  req.pause();
  // A client that gives up (test over, server timeout) drops out of the queue instead of being
  // forwarded onto a dead socket when the rule goes.
  const entry = { sub, url: req.url, resume: () => !res.destroyed && !res.writableEnded && forward(req, res) };
  held.push(entry);
  res.on("close", () => (held = held.filter((h) => h !== entry)));
});

// Realtime (WebSocket) passes straight through.
server.on("upgrade", (req, socket, head) => {
  const target = net.connect(Number(upstream.port), upstream.hostname, () => {
    const headers = Object.entries({ ...req.headers, host: upstream.host })
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    target.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if (head?.length) target.write(head);
    socket.pipe(target).pipe(socket);
  });
  target.on("error", () => socket.destroy());
  socket.on("error", () => target.destroy());
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[parity proxy] 127.0.0.1:${port} → ${upstream.origin}`);
});

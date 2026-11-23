import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, mkdirSync } from "node:fs";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const DB_PATH = process.env.DB_PATH || join(ROOT, "data/facevision.sqlite");
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    page TEXT NOT NULL,
    properties_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_name ON analytics_events(name);
`);

const insertEvent = db.prepare(`
  INSERT INTO analytics_events (name, session_id, page, properties_json, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
const countEvents = db.prepare("SELECT COUNT(*) AS count FROM analytics_events");

const allowedEvents = new Set([
  "detector_ready", "detector_error", "image_analyzed", "camera_started",
  "camera_stopped", "camera_error", "analytics_consent_granted", "analytics_consent_denied"
]);
const rate = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;
const RATE_MAX_KEYS = 10_000;
const TRUST_PROXY = process.env.TRUST_PROXY === "1";

// Allowed CORS origins: comma-separated ALLOWED_ORIGIN env, else the public site origins.
const DEFAULT_ORIGINS = ["https://jalen3495-glitch.github.io", "https://facevision.js.org"];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGINS.join(","))
  .split(",").map(o => o.trim()).filter(Boolean);

function corsHeaders(req) {
  const origin = req.headers.origin;
  const headers = { "vary": "Origin" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

// Periodically drop expired rate-limit entries so the map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of rate) {
    const fresh = times.filter(t => now - t < RATE_WINDOW_MS);
    if (fresh.length) rate.set(key, fresh); else rate.delete(key);
  }
}, RATE_WINDOW_MS).unref();

function json(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...(res.req ? corsHeaders(res.req) : {}),
    ...extraHeaders
  });
  res.end(payload);
}

function securityHeaders(res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(self), microphone=(), geolocation=()");
}

function validSession(value) { return typeof value === "string" && /^[a-f0-9-]{20,80}$/i.test(value); }
function validPage(value) { return typeof value === "string" && value.length <= 200 && value.startsWith("/"); }
function validProperties(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const key of ["mode", "faceCountBucket", "errorType"]) {
    if (typeof value[key] === "string" && value[key].length <= 40) out[key] = value[key];
  }
  return out;
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 16_384) throw new Error("body too large");
  }
  return JSON.parse(data || "{}");
}

function rateLimited(req) {
  const forwarded = TRUST_PROXY ? req.headers["x-forwarded-for"]?.split(",")[0]?.trim() : undefined;
  const key = forwarded || req.socket.remoteAddress || "anonymous";
  const now = Date.now();
  const previous = rate.get(key) || [];
  const fresh = previous.filter(t => now - t < RATE_WINDOW_MS);
  fresh.push(now);
  if (!rate.has(key) && rate.size >= RATE_MAX_KEYS) {
    // Evict the oldest-inserted key to keep memory bounded.
    rate.delete(rate.keys().next().value);
  }
  rate.set(key, fresh);
  return fresh.length > RATE_MAX_REQUESTS;
}

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8"
};

// Only the frontend files are public; never serve .env, data/*.sqlite, server code, etc.
const PUBLIC_FILES = new Set([
  "index.html", "404.html", "app.js", "analytics.js", "config.js", "style.css",
  "about.html", "privacy.html", "terms.html", "contact.html",
  "ads.txt", "robots.txt", "sitemap.xml", "favicon.svg", "site.webmanifest"
]);
const PUBLIC_PREFIXES = ["articles/", "js/", "img/"];
const PUBLIC_EXTS = new Set([".html", ".js", ".css", ".svg", ".png", ".txt", ".xml", ".webmanifest", ".ico"]);

function isPublicFile(rel) {
  if (PUBLIC_FILES.has(rel)) return true;
  if (rel.includes("..") || rel.includes("\\")) return false;
  return PUBLIC_PREFIXES.some((prefix) => rel.startsWith(prefix)) && PUBLIC_EXTS.has(extname(rel));
}

async function serveStatic(req, res) {
  let requestPath;
  try { requestPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { return json(res, 400, { error: "bad_request" }); }
  const safePath = normalize(requestPath).replace(/^([/\\])+/, "");
  let filePath = resolve(ROOT, safePath || "index.html");
  if (!filePath.startsWith(ROOT + "/") && filePath !== ROOT) return json(res, 403, { error: "forbidden" });
  let rel = filePath.slice(ROOT.length + 1) || "index.html";
  if (requestPath.endsWith("/") && rel !== "index.html") { rel = `${rel}/index.html`; filePath = join(filePath, "index.html"); }
  if (!isPublicFile(rel)) return json(res, 404, { error: "not_found" });
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
    res.setHeader("content-type", mime[extname(filePath)] || "application/octet-stream");
    res.setHeader("cache-control", requestPath.endsWith(".html") ? "no-cache" : "public, max-age=3600");
    createReadStream(filePath).pipe(res);
  } catch {
    json(res, 404, { error: "not_found" });
  }
}

const server = createServer(async (req, res) => {
  securityHeaders(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders(req),
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization",
      "access-control-max-age": "600"
    });
    return res.end();
  }

  let url;
  try { url = new URL(req.url, "http://localhost"); }
  catch { return json(res, 400, { error: "bad_request" }); }
  if (url.pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true, service: "facevision-api", time: new Date().toISOString() });
  }

  if (url.pathname === "/api/events" && req.method === "POST") {
    if (rateLimited(req)) return json(res, 429, { error: "rate_limited" });
    try {
      const body = await readBody(req);
      if (!allowedEvents.has(body.name) || !validSession(body.sessionId) || !validPage(body.page)) {
        return json(res, 400, { error: "invalid_event" });
      }
      const properties = validProperties(body.properties);
      insertEvent.run(body.name, body.sessionId, body.page, JSON.stringify(properties), new Date().toISOString());
      return json(res, 201, { ok: true });
    } catch {
      return json(res, 400, { error: "invalid_json" });
    }
  }

  if (url.pathname === "/api/stats" && req.method === "GET") {
    const token = process.env.ADMIN_TOKEN;
    if (!token || req.headers.authorization !== `Bearer ${token}`) return json(res, 401, { error: "unauthorized" });
    return json(res, 200, { events: countEvents.get().count });
  }

  if (req.method === "GET") return serveStatic(req, res);
  return json(res, 405, { error: "method_not_allowed" });
});

process.on("SIGINT", () => { db.close(); server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { db.close(); server.close(() => process.exit(0)); });
server.listen(PORT, HOST, () => console.log(`FaceVision API: http://${HOST}:${PORT}`));

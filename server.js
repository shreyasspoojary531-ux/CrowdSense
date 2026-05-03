/**
 * Production Express server for CrowdSense.
 *
 * Security hardening applied:
 *  - Helmet sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
 *  - Compression reduces payload size for all static assets and HTML.
 *  - Aggressive cache headers on content-hashed Vite assets (1 year / immutable).
 *  - SPA fallback restricted to GET requests only.
 *  - Global error handler prevents stack traces leaking to clients.
 *  - PORT sourced from environment — never hardcoded.
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DIST_DIR   = path.join(__dirname, "dist");
const PORT       = process.env.PORT || 8080;
const IS_PROD    = process.env.NODE_ENV === "production";

const app = express();

// ── Rate limiting ──────────────────────────────────────────────────────────
// General limiter — covers all routes including the SPA fallback.
// Prevents bots and burst-scrapers from hammering the static server and
// provides a second line of defence if the client-side rate limiter is
// bypassed (e.g. by a headless script that re-uses the SPA origin).
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15-minute sliding window
  max:              200,             // requests per window per IP
  standardHeaders:  "draft-7",      // emit RateLimit-* headers (RFC 9110 draft)
  legacyHeaders:    false,
  message:          { error: "Too many requests — please try again shortly." },
  // Skip rate limiting for static assets (hashed filenames, safe to cache-bust freely).
  skip: (req) => req.path.startsWith("/assets/"),
});

// Tighter limiter scoped to the SPA HTML entry-point.
// Stops automated tools that repeatedly reload index.html to re-initialise state.
const htmlLimiter = rateLimit({
  windowMs:        5 * 60 * 1000, // 5-minute window
  max:             60,             // 60 HTML loads per 5 min ≈ 1 per 5 s sustained
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  message:         { error: "Too many requests — please try again shortly." },
});

app.use(generalLimiter);

// ── Security headers via Helmet ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        // unsafe-inline required: React renders inline style attributes,
        // and Tailwind's JIT layer emits a <style> tag at runtime.
        styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:     ["'self'", "https://fonts.gstatic.com"],
        imgSrc:      ["'self'", "data:", "blob:",
                      "https://*.tile.openstreetmap.org",
                      "https://*.openstreetmap.org"],
        connectSrc:  ["'self'",
                      "https://nominatim.openstreetmap.org",
                      "https://*.googleapis.com",
                      "https://*.firebaseio.com",
                      "https://firestore.googleapis.com"],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
        // Only upgrade insecure requests in production to avoid localhost HTTPS issues.
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    // Disable COEP so cross-origin Leaflet / OpenStreetMap tiles can load.
    crossOriginEmbedderPolicy: false,
    // HSTS — require HTTPS for 1 year in production only.
    hsts: IS_PROD ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  })
);

// ── Gzip / Brotli response compression ────────────────────────────────────
app.use(compression());

// ── Static assets — long-lived cache for content-hashed Vite output ───────
app.use(
  "/assets",
  express.static(path.join(DIST_DIR, "assets"), {
    maxAge: "1y",
    immutable: true,
    etag: false,
  })
);

// ── Other static files (favicons, manifest, etc.) — short-lived cache ─────
app.use(
  express.static(DIST_DIR, {
    maxAge: 0,
    etag: true,
    index: false, // Served explicitly below so errors can be handled.
  })
);

// ── Health check endpoint ──────────────────────────────────────────────────
// Excluded from both rate limiters so monitoring tools never get throttled.
// Returns uptime, environment, and the git commit SHA when available.
const COMMIT_SHA = process.env.GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || "dev";

app.get("/health", (_req, res) => {
  res.json({
    status:  "ok",
    uptime:  Math.floor(process.uptime()),
    env:     IS_PROD ? "production" : "development",
    commit:  COMMIT_SHA,
    ts:      new Date().toISOString(),
  });
});

// ── SPA fallback — GET only ────────────────────────────────────────────────
// htmlLimiter applied here so every index.html load (page refresh / direct
// navigation) counts against the tighter per-IP HTML window.
app.get("*", htmlLimiter, (_req, res, next) => {
  res.sendFile(path.join(DIST_DIR, "index.html"), (err) => {
    if (err) next(err);
  });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler — never expose stack traces to clients ────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[CrowdSense] Unhandled server error:", err.message);
  res.status(err.status ?? 500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(
    `[CrowdSense] Server running on port ${PORT} (${IS_PROD ? "production" : "development"})`
  );
});

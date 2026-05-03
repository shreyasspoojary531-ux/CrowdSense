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

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DIST_DIR   = path.join(__dirname, "dist");
const PORT       = process.env.PORT || 8080;
const IS_PROD    = process.env.NODE_ENV === "production";

const app = express();

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

// ── SPA fallback — GET only ────────────────────────────────────────────────
app.get("*", (_req, res, next) => {
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

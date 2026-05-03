# CrowdSense AI

Real-time crowd intelligence web app built with React 19 + Vite 8 + Tailwind 4.

## Stack
- **Frontend**: React 19, Vite 8, Tailwind 4
- **Animations**: Framer Motion 12
- **Runtime**: Node.js 22
- **Storage**: Firebase (falls back to localStorage)
- **Maps**: react-leaflet + OpenStreetMap (Nominatim geocoding)
- **Charts**: recharts
- **Icons**: lucide-react
- **Fonts**: Inter (body) + Poppins (headings) via Google Fonts
- **Server**: Express + Helmet + Compression

## Architecture

### Pages (`src/pages/`)
- `Dashboard.jsx` — hero, metric grid, signal panel, live feed, featured place cards
- `Explore.jsx` — searchable/filterable grid of all places with import flow
- `Analytics.jsx` — leaderboard + prediction charts
- `ReportTab.jsx` — crowd report submission UI (QuickReportPanel + LiveReportFeed)
- `MapView.jsx` — Leaflet map with crowd-density venue markers, Nominatim search, import flow
- `PlaceDetail.jsx` — full detail view: capacity ring, time slider, prediction chart, report form

### Components (`src/components/`)
- `Sidebar.jsx` — fixed nav, live stats, dark/light toggle, place import search
- `SearchBar.jsx` — ARIA combobox, debounced filtering, all derivations memoised, maxLength=100
- `PlaceCard.jsx` — crowd level card with progress bar and animated capacity number
- `PlaceDetail.jsx` — full detail view: capacity ring, time slider, prediction chart, report form
- `QuickReportPanel.jsx` — place selector + level buttons + live preview
- `PredictionChart.jsx` — recharts area chart for crowd forecast
- `TimeSlider.jsx` — hour scrubber with crowd-at-time preview
- `LiveReportFeed.jsx` — live report stream list (staggered Framer Motion)
- `GlowCard.jsx` — pointer-tracking glow effect wrapper
- `AnimatedNumber.jsx` — spring-animated numeric display
- `common/MetricCard.jsx` — stat card with icon + value
- `common/ErrorBoundary.jsx` — catches unhandled render errors, shows reload UI
- `common/TypewriterText.jsx` — typewriter cycling animation
- `motion/variants.js` — shared Framer Motion animation variants

### Hooks & Utilities
- `src/hooks/useCrowdState.js` — central crowd state: getCrowd, submitReport, showToast, commitToTime, getDetail. Imports blending logic from crowdBlending.js. Clock ticks every 30 s; seed changes every 5 min to gate expensive recalculations.
- `src/utils/crowdBlending.js` — pure, testable blending math: `summarizeReports`, `mergeRealtimeSignals`, `clamp`, `LEVEL_TO_SCORE`, `MAX_REPORT_WINDOW`
- `src/utils/reportUtils.js` — `buildImportedPlace` (accepts lat/lng)
- `src/utils/prediction.js` — crowd scoring engine: `getCrowdAt`, `getPrediction`, `getBestTime`, `scoreToLevel`, `scoreToWait`, `formatHour`
- `src/utils/sanitize.js` — `sanitizePlaceName`, `sanitizeReportLevel`, `isValidPlaceId`, `VALID_LEVELS`
- `src/lib/liveReports.js` — Firebase/local publish+subscribe. Validates placeId & level before any write. Rate limiter: 5 req/60 s. Firestore `normalizeFirestoreReport` validates all doc fields; malformed docs are filtered (`.filter(Boolean)`)
- `src/lib/firebase.js` — Firebase init from `VITE_*` env vars only; guards against HMR duplicate init
- `src/data/places.js` — 12 static Bangalore-area places with lat/lng coordinates

## Security Hardening
- **server.js**: Helmet (CSP, HSTS in prod, X-Frame-Options, X-Content-Type-Options, etc.), Compression, long-lived cache headers on `/assets` (1-year + immutable), SPA fallback GET-only, global error handler (no stack traces to clients)
- **liveReports.js**: Firestore documents validated before use (type-check placeId string, level against VALID_LEVELS, timestamp numeric); malformed docs discarded
- **SearchBar.jsx**: `maxLength=100` on input prevents oversized queries
- **App.jsx**: Nominatim geocoding fetch wrapped in `AbortController` with 6 s timeout; response shape validated (`Array.isArray`) before parsing lat/lng

## Design System (`src/index.css`)
- **Tokens**: CSS custom properties for colors, spacing (8px grid), radii, shadows
- **Dark mode**: `.dark` class on `<html>`. Deep `#08080B` bg with 4-point radial mesh
- **Glassmorphism + Bevel**: Full-system bevel treatment on every surface via 4-layer `inset` box-shadows
- **Glass cards**: `.glass-card` — `blur(28px) saturate(1.8) brightness(1.02)`
- **Skeleton loaders**: `.page-skeleton`, `.skeleton-hero`, `.skeleton-grid`, `.skeleton-card` with shimmer animation
- **Buttons**: `.btn-primary` (145deg orange gradient + full bevel), `.btn-secondary`, `.btn-outline`
- **Status pills**: `.status-low/medium/high`, `.place-level-pill`, `.detail-level-pill`
- **Animations**: Framer Motion page transitions (AnimatePresence), staggered feed/card enters, `prefers-reduced-motion` CSS block
- **Map styles**: Leaflet popup, crowd marker, search dropdown all themed

## Key Features
- Live crowd reports blend into a smart average (weighted + time-decayed, via crowdBlending.js)
- Places imported from map search (Nominatim) merge into the Explore Places system
- Crowd-density venue markers on map (green/amber/red with emoji + ring)
- Time-travel slider: see predicted crowd at any upcoming hour
- Visitor intent system: "I will go at this time" nudges the forecast curve
- Commitment clustering: warns when too many people pick the same slot
- AI best-time recommendation per venue
- Local Live / Firebase Realtime modes
- Dark/light theme toggle (persisted in localStorage)
- Fully responsive: collapses sidebar at 1180px, mobile drawer at 860px

## Tests (`tests/`)
- `prediction.test.js` — getCrowdAt, getPrediction, getBestTime, scoreToLevel, scoreToWait, formatHour
- `sanitize.test.js` — sanitizePlaceName, sanitizeReportLevel, isValidPlaceId
- `reportUtils.test.js` — buildImportedPlace (shape, type inference, capacity, location)
- `crowdBlending.test.js` — summarizeReports, mergeRealtimeSignals, clamp, LEVEL_TO_SCORE
- `liveReports.test.js` — publishLiveReport input validation (placeId, level) + successful local publish

Run all: `npm test` | With coverage: `npm test -- --coverage`

## Babel / Jest Notes
- `babel.config.cjs` includes an inline `MetaProperty` plugin that rewrites `import.meta` → `({ env: {} })`, enabling any file that references `import.meta.env` to be parsed by Jest's CommonJS runtime without errors. All VITE_* lookups return `undefined`, so `isFirebaseConfigured` stays `false` during tests.
- `jest.config.cjs`: `testEnvironment: node`, `testMatch: **/tests/**/*.test.js`, `transformIgnorePatterns` allows firebase ESM through Babel.

## Workflow
- `npm run dev` — Vite dev server (port 5173 proxied by Replit)
- `npm run build` — Vite production build → `dist/`
- `node server.js` — Serve production build (Helmet + Compression)

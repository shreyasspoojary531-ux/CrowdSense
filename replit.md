# CrowdSense AI

Real-time crowd intelligence web app built with React 19 + Vite 8 + Tailwind 4.

## Stack
- **Frontend**: React 19, Vite 8, Tailwind 4
- **Runtime**: Node.js 22
- **Storage**: Firebase (falls back to localStorage)
- **Maps**: react-leaflet + OpenStreetMap (Nominatim geocoding)
- **Charts**: recharts
- **Icons**: lucide-react
- **Fonts**: Inter (body) + Poppins (headings) via Google Fonts

## Architecture

### Pages (`src/pages/`)
- `Dashboard.jsx` — hero, metric grid, signal panel, live feed, featured place cards
- `Explore.jsx` — searchable/filterable grid of all places with import flow
- `Analytics.jsx` — leaderboard + prediction charts
- `ReportConsole.jsx` — crowd report submission UI
- `MapView.jsx` — Leaflet map with crowd-density venue markers, Nominatim search, import flow

### Components (`src/components/`)
- `Sidebar.jsx` — fixed nav, live stats, dark/light toggle, place import search
- `PlaceCard.jsx` — crowd level card with progress bar and animated capacity number
- `PlaceDetail.jsx` — full detail view: capacity ring, time slider, prediction chart, report form
- `PredictionChart.jsx` — recharts area chart for crowd forecast
- `TimeSlider.jsx` — hour scrubber with crowd-at-time preview
- `LiveReportFeed.jsx` — live report stream list
- `GlowCard.jsx` — pointer-tracking glow effect wrapper
- `AnimatedNumber.jsx` — spring-animated numeric display
- `common/MetricCard.jsx` — stat card with icon + value
- `common/TypewriterText.jsx` — typewriter cycling animation

### Hooks & Utilities
- `src/hooks/useCrowdState.js` — central crowd state: getCrowd, submitReport, showToast, commitToTime, getDetail, etc.
- `src/utils/reportUtils.js` — buildImportedPlace (accepts lat/lng)
- `src/data/places.js` — 12 static Bangalore-area places with lat/lng coordinates

## Design System (`src/index.css`)
- **Tokens**: CSS custom properties for colors, spacing (8px grid), radii, shadows
- **Dark mode**: `.dark` class on `<html>`. Deep `#08080B` bg with 4-point radial mesh (brand orange top-left, violet top-right, warm bleed bottom-right, cool indigo bottom-left)
- **Glassmorphism + Bevel**: Full-system bevel treatment on every surface via 4-layer `inset` box-shadows:
  - Top-left face highlights: `inset 0 1px 0 rgba(255,255,255,…)` + `inset 1px 0 0 rgba(255,255,255,…)`
  - Bottom-right recession: `inset 0 -1px 0 rgba(0,0,0,…)` + `inset -1px 0 0 rgba(0,0,0,…)`
  - Applied to: `.glass-card`, `.sidebar`, `.nav-bar`, `.brand-mark`, `.sidebar-item.active`, `.sidebar-import`, `.sidebar-live-card`, `.btn-primary`, `.btn-secondary`, `.search-shell`, `.hero-signal-grid > div`, `.metric-card-icon`, `.place-card-icon`, `.signal-item`, `.leaderboard-item`, `.feed-item`, `.stat-chip`, `.cat-pill.active`, `.switcher-pill.active`, `.chart-tooltip`, `.best-time-card`, `.impact-card`, `.peak-warning`, `.tip-banner`
- **Glass cards**: `.glass-card` — `blur(28px) saturate(1.8) brightness(1.02)`, `::before` top-left light sweep, `::after` bottom-right vignette
- **Skeleton loaders**: `.page-skeleton`, `.skeleton-hero`, `.skeleton-grid`, `.skeleton-card` with shimmer animation
- **Buttons**: `.btn-primary` (145deg orange gradient + full bevel), `.btn-secondary` (surface gradient + bevel), `.btn-outline`
- **Status pills**: `.status-low/medium/high`, `.place-level-pill`, `.detail-level-pill`
- **Map styles**: Leaflet popup, crowd marker, search dropdown all themed

## Key Features
- Live crowd reports blend into a smart average (weighted + time-decayed)
- Places imported from map search (Nominatim) merge into the Explore Places system
- Crowd-density venue markers on map (green/amber/red with emoji + ring)
- Time-travel slider: see predicted crowd at any upcoming hour
- Visitor intent system: "I will go at this time" nudges the forecast curve
- Commitment clustering: warns when too many people pick the same slot
- AI best-time recommendation per venue
- Local Live / Firebase Realtime modes
- Dark/light theme toggle (persisted in localStorage)
- Fully responsive: collapses sidebar at 1180px, mobile drawer at 860px

## Workflow
- `npm run dev` — starts Vite dev server (port 5173 proxied by Replit)

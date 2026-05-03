import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight, Layers, MapPin, PlusSquare, Search, X, Navigation } from "lucide-react";
import { inferTypeFromQuery } from "../data/suggestions";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/** Crowd level → ring / dot colour. */
const CROWD_COLOR = {
  Low: "#22C55E",
  Medium: "#F59E0B",
  High: "#EF4444",
};

/**
 * Create a custom circular DivIcon for a CrowdSense venue marker.
 * Shows the venue emoji inside a coloured ring, with a small status dot.
 */
function createCrowdIcon(level, emoji) {
  const color = CROWD_COLOR[level] || CROWD_COLOR.Low;
  const html = `
    <div style="
      position: relative;
      width: 44px; height: 44px;
      border-radius: 50%;
      background: #fff;
      border: 3px solid ${color};
      box-shadow: 0 2px 12px rgba(0,0,0,0.22), 0 0 0 2px ${color}22;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      line-height: 1;
    ">
      ${emoji}
      <span style="
        position: absolute;
        bottom: -5px; left: 50%; transform: translateX(-50%);
        width: 11px; height: 11px;
        border-radius: 50%;
        background: ${color};
        border: 2.5px solid #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "></span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -54],
  });
}

const searchIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const clickIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Fly to a specific lat/lng+zoom when `target` changes. */
function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom ?? 14, { duration: 1.2 });
    }
  }, [map, target]);
  return null;
}

/** Auto-fit map bounds to show all venue markers on first render. */
function AutoFitBounds({ markers }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map(({ place }) => [place.lat, place.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [52, 52], maxZoom: 14, animate: true, duration: 0.8 });
      fitted.current = true;
    }
  }, [map, markers]);

  return null;
}

/** Re-fits bounds whenever `trigger` increments (for the "View all" button). */
function FitAllController({ markers, trigger }) {
  const map = useMap();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTrigger.current || markers.length === 0) return;
    lastTrigger.current = trigger;
    const bounds = L.latLngBounds(markers.map(({ place }) => [place.lat, place.lng]));
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [52, 52], maxZoom: 14, duration: 1.0 });
    }
  }, [map, markers, trigger]);

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

/**
 * MapView page.
 *
 * crowds        — array of { place, crowd } from App.jsx (all places, memoised)
 * onSelectPlace — navigate to PlaceDetail
 * onImportPlace — adds to Explore Places (now geocodes if no coords)
 * importing     — boolean while an import is in-progress
 */
export function MapView({ crowds = [], onSelectPlace, onImportPlace, importing }) {
  const [userPosition, setUserPosition] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [clickMarkers, setClickMarkers] = useState([]);
  const [searchMarker, setSearchMarker] = useState(null);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);

  /** Only places that carry coordinates are shown as markers. */
  const venueMarkers = useMemo(
    () => crowds.filter(({ place }) => place.lat != null && place.lng != null),
    [crowds]
  );

  // Crowd level counts for the legend
  const levelCounts = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    venueMarkers.forEach(({ crowd }) => {
      if (counts[crowd.level] != null) counts[crowd.level]++;
    });
    return counts;
  }, [venueMarkers]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(coords);
      },
      () => {
        // No geolocation — AutoFitBounds will handle initial view
      }
    );
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setSuggestions(data);
        setDropdownOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSuggestionSelect = useCallback((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const placeName = item.display_name.split(",")[0].trim();
    const placeLocation = item.display_name.split(",").slice(1, 3).join(",").trim();
    setSearchMarker({
      lat, lng,
      label: item.display_name,
      name: placeName,
      location: placeLocation,
      nominatimType: item.type || item.class || "",
    });
    setFlyTarget({ lat, lng, zoom: 15 });
    setQuery(placeName);
    setSuggestions([]);
    setDropdownOpen(false);
  }, []);

  const handleMapClick = useCallback((latlng) => {
    setClickMarkers((prev) => [
      ...prev,
      { id: Date.now(), lat: latlng.lat, lng: latlng.lng },
    ]);
  }, []);

  const removeClickMarker = useCallback((id) => {
    setClickMarkers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPosition(coords);
      setFlyTarget({ ...coords, zoom: 16 });
    });
  }, []);

  const handleAddSearchedPlace = useCallback(() => {
    if (!onImportPlace || !searchMarker || importing) return;
    onImportPlace({
      name: searchMarker.name,
      type: inferTypeFromQuery(searchMarker.name + " " + searchMarker.nominatimType),
      location: searchMarker.location || `${searchMarker.lat.toFixed(5)}, ${searchMarker.lng.toFixed(5)}`,
      lat: searchMarker.lat,
      lng: searchMarker.lng,
    });
  }, [onImportPlace, searchMarker, importing]);

  const handleAddClickedPlace = useCallback((marker) => {
    if (!onImportPlace || importing) return;
    onImportPlace({
      name: `Location ${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`,
      type: "restaurant",
      location: `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}`,
      lat: marker.lat,
      lng: marker.lng,
    });
  }, [onImportPlace, importing]);

  const defaultCenter = [12.9716, 77.5946];

  return (
    <div className="map-page-stack">
      <div className="map-page-header">
        <div className="section-kicker">Live map</div>
        <h2 style={{ margin: "6px 0 4px", fontFamily: "Poppins, sans-serif", fontSize: "1.4rem", letterSpacing: "-0.02em" }}>
          All Explore Places on the Map
        </h2>
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
          Every tracked venue is pinned with a live crowd level. Search to add new places — they appear here automatically.
        </p>
      </div>

      {/* ── Legend + stats ── */}
      <div className="map-legend-row">
        {Object.entries(CROWD_COLOR).map(([level, color]) => (
          <span key={level} className="map-legend-chip">
            <i style={{ background: color }} />
            {level}
            <span style={{ marginLeft: 2, opacity: 0.7, fontSize: "0.76rem" }}>
              ({levelCounts[level]})
            </span>
          </span>
        ))}
        <span className="map-legend-sep" />
        <span className="map-legend-count">
          {venueMarkers.length} venue{venueMarkers.length !== 1 ? "s" : ""} pinned
        </span>
        {venueMarkers.length > 0 && (
          <button
            type="button"
            className="map-clear-pins-btn"
            style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)", color: "#818CF8" }}
            onClick={() => setFitAllTrigger((t) => t + 1)}
          >
            <Layers size={12} style={{ display: "inline", marginRight: 5 }} />
            View all {venueMarkers.length}
          </button>
        )}
      </div>

      {/* ── Search + locate ── */}
      <div className="map-controls-row">
        <div className="map-search-wrapper">
          <div className="search-shell map-search-shell">
            <Search size={16} aria-hidden="true" />
            <input
              className="import-input"
              placeholder="Search any place to add it to your map…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 180)}
              aria-label="Search places"
              aria-autocomplete="list"
              aria-expanded={dropdownOpen}
            />
            {query && (
              <button
                type="button"
                className="map-clear-btn"
                onClick={() => { setQuery(""); setSuggestions([]); setDropdownOpen(false); setSearchMarker(null); }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
            {searching && <span className="map-searching-dot" aria-hidden="true" />}
          </div>

          {dropdownOpen && suggestions.length > 0 && (
            <div className="search-results-overlay map-dropdown" role="listbox" aria-label="Place suggestions">
              {suggestions.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="import-suggestion"
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(item); }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "0.93rem" }}>
                      {item.display_name.split(",")[0]}
                    </strong>
                    <span className="import-meta">
                      {item.display_name.split(",").slice(1, 3).join(",").trim()}
                    </span>
                  </div>
                  <span className="import-badge">{item.type || item.class}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-secondary map-locate-btn"
          onClick={handleLocateMe}
          aria-label="Center map on my location"
        >
          <Navigation size={16} aria-hidden="true" />
          <span>My location</span>
        </button>
      </div>

      <div className="map-hint-row">
        <MapPin size={13} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
        <span>Click anywhere on the map to drop a pin. Open any popup to add it to Explore Places.</span>
        {clickMarkers.length > 0 && (
          <button
            type="button"
            className="map-clear-pins-btn"
            onClick={() => setClickMarkers([])}
          >
            Clear {clickMarkers.length} pin{clickMarkers.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* ── Map ── */}
      <div className="glass-card map-container-card">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          className="leaflet-map"
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          {/* Auto-fit to all venue markers on first load */}
          <AutoFitBounds markers={venueMarkers} />

          {/* Re-fit when "View all" is triggered */}
          <FitAllController markers={venueMarkers} trigger={fitAllTrigger} />

          {/* Fly-to when a search result or locate is triggered */}
          <FlyToLocation target={flyTarget} />

          <MapClickHandler onMapClick={handleMapClick} />

          {/* ── CrowdSense venue markers — every place from Explore Places ── */}
          {venueMarkers.map(({ place, crowd }) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createCrowdIcon(crowd.level, place.icon)}
            >
              <Popup minWidth={210}>
                <div className="map-popup map-popup-venue">
                  <div className="map-popup-venue-header">
                    <span className="map-popup-venue-icon">{place.icon}</span>
                    <div>
                      <strong>{place.name}</strong>
                      <span className="map-popup-venue-location">{place.location}</span>
                    </div>
                  </div>

                  <div className="map-popup-crowd-row">
                    <span
                      className="map-popup-level-dot"
                      style={{ background: CROWD_COLOR[crowd.level] }}
                    />
                    <span
                      className="map-popup-level-label"
                      style={{ color: CROWD_COLOR[crowd.level] }}
                    >
                      {crowd.level} crowd
                    </span>
                    <span className="map-popup-percent">{crowd.percent}%</span>
                  </div>

                  <div className="map-popup-wait">
                    Wait: <strong>{crowd.wait}</strong>
                  </div>

                  {onSelectPlace && (
                    <button
                      type="button"
                      className="map-popup-view-btn"
                      onClick={() => onSelectPlace(place)}
                      aria-label={`View details for ${place.name}`}
                    >
                      <ArrowRight size={13} aria-hidden="true" />
                      View live details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ── User position ── */}
          {userPosition && (
            <Marker position={[userPosition.lat, userPosition.lng]}>
              <Popup>
                <div className="map-popup">
                  <strong>You are here</strong>
                  <span className="map-popup-coords">
                    {userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ── Nominatim search result marker ── */}
          {searchMarker && (
            <Marker position={[searchMarker.lat, searchMarker.lng]} icon={searchIcon}>
              <Popup minWidth={200}>
                <div className="map-popup">
                  <strong>{searchMarker.name}</strong>
                  {searchMarker.location && <span>{searchMarker.location}</span>}
                  <span className="map-popup-coords">
                    {searchMarker.lat.toFixed(5)}, {searchMarker.lng.toFixed(5)}
                  </span>
                  {onImportPlace && (
                    <button
                      type="button"
                      className="map-popup-add-btn"
                      onClick={handleAddSearchedPlace}
                      disabled={importing}
                    >
                      <PlusSquare size={13} aria-hidden="true" />
                      {importing ? "Adding…" : "Add to Explore Places"}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* ── Click-dropped pin markers ── */}
          {clickMarkers.map((m) => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={clickIcon}>
              <Popup minWidth={200}>
                <div className="map-popup">
                  <strong>Dropped pin</strong>
                  <span className="map-popup-coords">
                    {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </span>
                  {onImportPlace && (
                    <button
                      type="button"
                      className="map-popup-add-btn"
                      onClick={() => handleAddClickedPlace(m)}
                      disabled={importing}
                    >
                      <PlusSquare size={13} aria-hidden="true" />
                      {importing ? "Adding…" : "Add to Explore Places"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="map-popup-remove"
                    onClick={() => removeClickMarker(m.id)}
                  >
                    Remove pin
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, X, Navigation } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom ?? 14, { duration: 1.2 });
    }
  }, [map, target]);
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

export function MapView() {
  const [userPosition, setUserPosition] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [clickMarkers, setClickMarkers] = useState([]);
  const [searchMarker, setSearchMarker] = useState(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(coords);
        setFlyTarget({ ...coords, zoom: 14 });
      },
      () => {
        setFlyTarget({ lat: 20.5937, lng: 78.9629, zoom: 5 });
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
    setSearchMarker({ lat, lng, label: item.display_name });
    setFlyTarget({ lat, lng, zoom: 14 });
    setQuery(item.display_name.split(",")[0]);
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

  const defaultCenter = [20.5937, 78.9629];

  return (
    <div className="map-page-stack">
      <div className="map-page-header">
        <div className="section-kicker">Live map</div>
        <h2 style={{ margin: "6px 0 4px", fontFamily: "Poppins, sans-serif", fontSize: "1.4rem" }}>
          OpenStreetMap Explorer
        </h2>
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
          Search places, click to drop pins, and explore the world.
        </p>
      </div>

      <div className="map-controls-row">
        <div className="map-search-wrapper">
          <div className="search-shell map-search-shell">
            <Search size={16} aria-hidden="true" />
            <input
              className="import-input"
              placeholder="Search any place on the map…"
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
        <span>Click anywhere on the map to drop a pin with coordinates.</span>
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

      <div className="glass-card map-container-card">
        <MapContainer
          center={defaultCenter}
          zoom={5}
          className="leaflet-map"
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          <FlyToLocation target={flyTarget} />
          <MapClickHandler onMapClick={handleMapClick} />

          {userPosition && (
            <Marker position={[userPosition.lat, userPosition.lng]}>
              <Popup>
                <div className="map-popup">
                  <strong>You are here</strong>
                  <span>
                    {userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {searchMarker && (
            <Marker
              position={[searchMarker.lat, searchMarker.lng]}
              icon={searchIcon}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{searchMarker.label.split(",")[0]}</strong>
                  <span>{searchMarker.label.split(",").slice(1, 3).join(",").trim()}</span>
                  <span style={{ marginTop: "4px", display: "block", opacity: 0.65, fontSize: "0.78rem" }}>
                    {searchMarker.lat.toFixed(5)}, {searchMarker.lng.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {clickMarkers.map((m) => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={clickIcon}>
              <Popup>
                <div className="map-popup">
                  <strong>Dropped pin</strong>
                  <span>
                    {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                  </span>
                  <button
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

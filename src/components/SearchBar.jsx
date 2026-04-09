import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";

const PLACE_SUGGESTIONS = [
  { name: "Central Perk Cafe", type: "cafe", location: "5th Avenue, Midtown" },
  { name: "Riverside Library", type: "library", location: "Riverside Blvd" },
  { name: "Iron Temple Gym", type: "gym", location: "Market Street" },
  { name: "Sunset Bistro", type: "restaurant", location: "Ocean Drive" },
  { name: "Maple Mall", type: "mall", location: "Oak District" },
  { name: "Aurora Museum", type: "museum", location: "Old Town" },
  { name: "Greenway Park", type: "park", location: "Lakeview" },
  { name: "The Study Nook", type: "library", location: "West End" },
];

const TYPE_LABELS = {
  restaurant: "Restaurant",
  gym: "Gym",
  library: "Library",
  cafe: "Cafe",
  mall: "Mall",
  park: "Park",
  museum: "Museum",
};

function inferTypeFromQuery(query) {
  const q = query.toLowerCase();
  if (q.includes("gym") || q.includes("fitness")) return "gym";
  if (q.includes("library") || q.includes("book")) return "library";
  if (q.includes("cafe") || q.includes("coffee")) return "cafe";
  if (q.includes("mall") || q.includes("plaza")) return "mall";
  if (q.includes("park") || q.includes("garden")) return "park";
  if (q.includes("museum") || q.includes("gallery")) return "museum";
  if (q.includes("restaurant") || q.includes("diner") || q.includes("eatery")) return "restaurant";
  return "restaurant";
}

export function SearchBar({ onImportPlace, importing, onTabChange }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredSuggestions = useMemo(() => {
    if (!normalizedQuery) {
      return PLACE_SUGGESTIONS.slice(0, 5);
    }
    return PLACE_SUGGESTIONS.filter((suggestion) => {
      const target = `${suggestion.name} ${suggestion.location} ${suggestion.type}`.toLowerCase();
      return target.includes(normalizedQuery);
    }).slice(0, 6);
  }, [normalizedQuery]);

  const hasExactMatch = PLACE_SUGGESTIONS.some(
    (suggestion) => suggestion.name.toLowerCase() === normalizedQuery
  );
  const allowCustom = normalizedQuery.length > 2 && !hasExactMatch;
  const customType = allowCustom ? inferTypeFromQuery(normalizedQuery) : null;

  const suggestionsToShow = allowCustom
    ? [
        ...filteredSuggestions,
        {
          name: query.trim(),
          type: customType,
          location: "Custom import",
          custom: true,
        },
      ]
    : filteredSuggestions;

  function handleSuggestionSelect(suggestion) {
    if (!onImportPlace || importing) return;

    onImportPlace({
      name: suggestion.name,
      type: suggestion.type,
      location: suggestion.location,
    });

    setQuery("");
    setFocused(false);
    if (onTabChange) onTabChange("explore");
  }

  return (
    <div className="top-search-bar" style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
      <div className="search-shell">
        <Search size={16} />
        <input
          className="import-input"
          placeholder="Search restaurants, gyms..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && allowCustom && !importing) {
              event.preventDefault();
              handleSuggestionSelect(suggestionsToShow[suggestionsToShow.length - 1]);
            }
          }}
          disabled={importing}
        />
      </div>
      {focused && suggestionsToShow.length > 0 && (
        <div className="search-results-overlay">
          {suggestionsToShow.map((suggestion) => (
            <button
              key={`${suggestion.name}-${suggestion.location}`}
              type="button"
              className="import-suggestion"
              onMouseDown={(event) => {
                event.preventDefault();
                handleSuggestionSelect(suggestion);
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>
                  {suggestion.custom ? `Add "${suggestion.name}"` : suggestion.name}
                </strong>
                <span className="import-meta" style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                  {suggestion.location}
                </span>
              </div>
              <span className="import-badge">{TYPE_LABELS[suggestion.type] || "Place"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

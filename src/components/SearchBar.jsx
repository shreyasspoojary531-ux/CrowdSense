import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  PLACE_SUGGESTIONS,
  TYPE_LABELS,
  inferTypeFromQuery,
} from "../data/suggestions";

/** Unique ID for the suggestions listbox — used to wire up ARIA combobox pattern. */
const LISTBOX_ID = "search-suggestions-listbox";

/**
 * Top-of-page venue search bar.
 *
 * Implements the ARIA combobox pattern so keyboard and screen-reader users can
 * navigate and select suggestions without a mouse.
 *
 * Debounces the expensive filtering work by 250 ms so rapid typing doesn't
 * block the main thread.
 */
export function SearchBar({ onImportPlace, importing, onTabChange }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  // Debounce the query used for filtering suggestions (250 ms).
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const filteredSuggestions = useMemo(() => {
    if (!debouncedQuery) return PLACE_SUGGESTIONS.slice(0, 5);
    return PLACE_SUGGESTIONS.filter((s) => {
      const target = `${s.name} ${s.location} ${s.type}`.toLowerCase();
      return target.includes(debouncedQuery);
    }).slice(0, 6);
  }, [debouncedQuery]);

  const hasExactMatch = PLACE_SUGGESTIONS.some(
    (s) => s.name.toLowerCase() === debouncedQuery
  );
  const allowCustom = debouncedQuery.length > 2 && !hasExactMatch;
  const customType = allowCustom ? inferTypeFromQuery(debouncedQuery) : null;

  const suggestionsToShow = useMemo(
    () =>
      allowCustom
        ? [
            ...filteredSuggestions,
            { name: query.trim(), type: customType, location: "Custom import", custom: true },
          ]
        : filteredSuggestions,
    [allowCustom, customType, filteredSuggestions, query]
  );

  const isOpen = focused && suggestionsToShow.length > 0;

  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      if (!onImportPlace || importing) return;
      onImportPlace({
        name: suggestion.name,
        type: suggestion.type,
        location: suggestion.location,
      });
      setQuery("");
      setDebouncedQuery("");
      setFocused(false);
      if (onTabChange) onTabChange("explore");
    },
    [importing, onImportPlace, onTabChange]
  );

  return (
    <div
      className="top-search-bar"
      style={{ position: "relative", width: "100%", maxWidth: "400px" }}
    >
      {/* Combobox wrapper */}
      <div className="search-shell" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-owns={LISTBOX_ID}>
        <Search size={16} aria-hidden="true" />
        <input
          className="import-input"
          placeholder="Search restaurants, gyms…"
          value={query}
          aria-label="Search and import a venue"
          aria-autocomplete="list"
          aria-controls={LISTBOX_ID}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && allowCustom && !importing) {
              e.preventDefault();
              handleSuggestionSelect(suggestionsToShow[suggestionsToShow.length - 1]);
            }
          }}
          disabled={importing}
        />
      </div>

      {/* Suggestions dropdown */}
      {isOpen && (
        <div
          id={LISTBOX_ID}
          className="search-results-overlay"
          role="listbox"
          aria-label="Venue suggestions"
        >
          {suggestionsToShow.map((suggestion) => (
            <button
              key={`${suggestion.name}-${suggestion.location}`}
              type="button"
              role="option"
              aria-selected="false"
              className="import-suggestion"
              onMouseDown={(e) => {
                e.preventDefault(); // Keep focus on input.
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

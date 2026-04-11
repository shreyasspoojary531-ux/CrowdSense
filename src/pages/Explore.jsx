import React, { memo } from "react";
import { CATEGORIES } from "../data/places";
import { PlaceCard } from "../components/PlaceCard";

/**
 * Explore page — browse all tracked venues filtered by category.
 *
 * Category pills act as a toggle group; each pill sets the active category
 * which is then used by the parent to derive `filteredCrowds` via useMemo.
 */
export const Explore = memo(function Explore({
  filteredCrowds,
  category,
  onCategoryChange,
  onSelectPlace,
}) {
  return (
    <div className="page-stack">
      {/* Category filter pills */}
      <div className="filter-row" role="group" aria-label="Filter venues by category">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`cat-pill ${category === cat.id ? "active" : ""}`}
            onClick={() => onCategoryChange(cat.id)}
            aria-pressed={category === cat.id}
          >
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Venue grid */}
      <div className="explore-grid" aria-label="Venues">
        {filteredCrowds.map(({ place, crowd }) => (
          <PlaceCard
            key={place.id}
            place={place}
            crowd={crowd}
            onClick={() => onSelectPlace(place)}
          />
        ))}
      </div>
    </div>
  );
});

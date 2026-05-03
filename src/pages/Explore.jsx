import React, { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORIES } from "../data/places";
import { PlaceCard } from "../components/PlaceCard";
import { fadeUp, scaleIn, staggerContainer } from "../components/motion/variants";

/**
 * Explore page — browse all tracked venues filtered by category.
 * Cards animate in/out with layout transitions when the category filter changes.
 */
export const Explore = memo(function Explore({
  filteredCrowds,
  category,
  onCategoryChange,
  onSelectPlace,
}) {
  return (
    <motion.div
      className="page-stack"
      variants={staggerContainer(0.08, 0)}
      initial="hidden"
      animate="show"
    >
      {/* Category filter pills */}
      <motion.div
        className="filter-row"
        role="group"
        aria-label="Filter venues by category"
        variants={fadeUp}
      >
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.id}
            type="button"
            className={`cat-pill ${category === cat.id ? "active" : ""}`}
            onClick={() => onCategoryChange(cat.id)}
            aria-pressed={category === cat.id}
            whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{cat.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Venue grid — AnimatePresence so cards enter/exit on filter change */}
      <div className="explore-grid" aria-label="Venues">
        <AnimatePresence mode="popLayout">
          {filteredCrowds.map(({ place, crowd }) => (
            <motion.div
              key={place.id}
              layout
              variants={scaleIn}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            >
              <PlaceCard
                place={place}
                crowd={crowd}
                onClick={() => onSelectPlace(place)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

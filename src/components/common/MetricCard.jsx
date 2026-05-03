import React, { memo } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../motion/variants";

/**
 * A single metric display card with an icon, label, and value.
 * Wrapped with React.memo to prevent re-renders when unrelated app state changes.
 * Uses Framer Motion for staggered entry animations when inside a stagger container.
 *
 * @param {{ icon: React.ComponentType, label: string, value: string|number, tone?: string }} props
 */
export const MetricCard = memo(function MetricCard({ icon: IconComponent, label, value, tone = "default" }) {
  return (
    <motion.div
      className={`glass-card metric-card tone-${tone}`}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
    >
      <div className="metric-card-icon">
        <IconComponent size={18} aria-hidden="true" />
      </div>
      <div className="metric-card-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </motion.div>
  );
});

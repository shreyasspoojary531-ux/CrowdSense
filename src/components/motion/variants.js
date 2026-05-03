/**
 * Shared Framer Motion variants for CrowdSense.
 * Centralised here so every animated component uses identical timing + easing.
 *
 * Easing: spring-like ease-out — cubic-bezier(0.16, 1, 0.3, 1)
 * All durations ≤ 400 ms per the animation spec.
 */

export const EASE   = [0.16, 1, 0.3, 1];
export const EASE_FAST = [0.22, 1, 0.36, 1];

// ── Single-element entries ──────────────────────────────────────────────────

/** Standard fade + slide-up entry for cards, panels, sections. */
export const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.38, ease: EASE },
  },
  exit: {
    opacity: 0, y: -10,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

/** Pure opacity fade — for overlays, badges, pills. */
export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: "easeIn" } },
};

/** Scale + fade — for icons, chips, small elements. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.82 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE } },
  exit:  { opacity: 0, scale: 0.88, transition: { duration: 0.15 } },
};

/** Slide in from left — for list items and feed rows. */
export const slideInLeft = {
  hidden: { opacity: 0, x: -16, scale: 0.97 },
  show: {
    opacity: 1, x: 0, scale: 1,
    transition: { duration: 0.32, ease: EASE },
  },
  exit: {
    opacity: 0, x: 12,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

// ── Stagger containers ──────────────────────────────────────────────────────

/**
 * Returns a variants object whose "show" state staggers children.
 * @param {number} stagger  - Delay between each child (seconds). Default 0.06.
 * @param {number} delay    - Initial delay before first child animates. Default 0.04.
 */
export function staggerContainer(stagger = 0.06, delay = 0.04) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

// ── Full-page transitions ───────────────────────────────────────────────────

/** Page-level enter/exit used inside AnimatePresence (App.jsx). */
export const pageVariant = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.28, ease: EASE_FAST },
  },
  exit: {
    opacity: 0, y: -6,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};

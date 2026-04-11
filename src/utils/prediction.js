/**
 * Crowd Prediction Engine v2
 *
 * Core mathematical engine for crowd scoring, level classification,
 * and time-based forecast generation. All functions are pure and side-effect free.
 *
 * scoreToLevel and scoreToWait are exported so useCrowdState can import them
 * instead of maintaining duplicate definitions.
 */

const NOISE_AMPLITUDE = 0.12;

function noise(placeId, hour, seed = 0) {
  const hash = (placeId.charCodeAt(0) * 31 + Math.floor(hour * 2) * 17 + seed * 7) % 100;
  return (hash / 100) * NOISE_AMPLITUDE * 2 - NOISE_AMPLITUDE;
}

function baseCrowdScore(peakHours, hour) {
  let score = 0.12;
  for (const [start, end] of peakHours) {
    const mid = (start + end) / 2;
    const spread = (end - start) / 2;
    const dist = Math.abs(hour - mid) / spread;
    const gaussian = Math.exp(-dist * dist * 1.5);
    score = Math.max(score, 0.25 + gaussian * 0.7);
  }
  return Math.min(score, 1.0);
}

/**
 * Map a raw crowd score (0–1) to a descriptive level label.
 * Thresholds: Low < 0.38 | 0.38 <= Medium < 0.65 | High >= 0.65
 *
 * @param {number} score
 * @returns {"Low"|"Medium"|"High"}
 */
export function scoreToLevel(score) {
  if (score >= 0.65) return "High";
  if (score >= 0.38) return "Medium";
  return "Low";
}

/**
 * Estimate a human-readable wait time from a crowd score.
 *
 * @param {number} score
 * @returns {string} e.g. "< 2 min" or "18 min"
 */
export function scoreToWait(score) {
  if (score < 0.38) return "< 2 min";
  if (score < 0.65) return `${Math.round(5 + score * 10)} min`;
  return `${Math.round(15 + score * 25)} min`;
}

/**
 * Get crowd info for a place at a specific hour.
 * Supports a commitments map that adds artificial crowd pressure.
 * @param {object} place
 * @param {number} hour
 * @param {number} seed
 * @param {object} commitments - { [placeId_halfHour]: count }
 */
export function getCrowdAt(place, hour, seed = 0, commitments = {}) {
  const base = baseCrowdScore(place.peakHours, hour);
  const n = noise(place.id, hour, seed);
  let score = Math.max(0, Math.min(1, base + n));

  // Apply commitment pressure
  const halfHour = Math.round(hour * 2) / 2;
  const key = `${place.id}_${halfHour}`;
  const commitCount = commitments[key] || 0;
  if (commitCount > 0) {
    // Each commitment group adds ~5-8% pressure
    const pressure = Math.min(commitCount * 0.06, 0.35);
    score = Math.min(1, score + pressure);
  }

  return {
    score,
    level: scoreToLevel(score),
    wait: scoreToWait(score),
    percent: Math.round(score * 100),
  };
}

/**
 * Generate prediction slots for the next ~3 hours.
 */
export function getPrediction(place, seed = 0, commitments = {}) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const startMin = currentMin < 30 ? 30 : 60;
  const slots = [];

  for (let i = 0; i <= 5; i++) {
    const totalMins = currentHour * 60 + startMin + i * 30;
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const info = getCrowdAt(place, h + m / 60, seed, commitments);
    const suffix = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const label = `${displayH}:${m === 0 ? "00" : "30"} ${suffix}`;
    slots.push({ label, hour: h + m / 60, ...info });
  }
  return slots;
}

/**
 * Generate a full-day prediction for the time slider (every 30 min).
 */
export function getFullDayPrediction(place, seed = 0, commitments = {}) {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h + m / 60;
      const info = getCrowdAt(place, hour, seed, commitments);
      const suffix = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayH}:${m === 0 ? "00" : "30"} ${suffix}`;
      slots.push({ label, hour, ...info });
    }
  }
  return slots;
}

/**
 * Find best hour to visit in the next 6 hours.
 */
export function getBestTime(place, seed = 0, commitments = {}) {
  const now = new Date();
  const currentHour = now.getHours();
  let bestScore = Infinity;
  let bestLabel = "";
  let bestHour = currentHour;

  for (let i = 0; i <= 12; i++) {
    const h = currentHour + i * 0.5;
    const info = getCrowdAt(place, h, seed, commitments);
    if (info.score < bestScore) {
      bestScore = info.score;
      const totalMins = Math.round(h * 60);
      const rh = Math.floor(totalMins / 60) % 24;
      const rm = totalMins % 60;
      const suffix = rh >= 12 ? "PM" : "AM";
      const displayH = rh % 12 === 0 ? 12 : rh % 12;
      bestLabel = `${displayH}:${rm === 0 ? "00" : "30"} ${suffix}`;
      bestHour = h;
    }
  }
  return { label: bestLabel, hour: bestHour, score: bestScore, level: scoreToLevel(bestScore) };
}

/** Smart tip. */
export function getSmartTip(place, currentCrowd, bestTime) {
  const tips = {
    High: [
      `Avoid now – peak crowd detected. Visit around ${bestTime.label} for less waiting.`,
      `It's packed right now. Our AI suggests ${bestTime.label} as the optimal window.`,
    ],
    Medium: [
      `Moderate traffic. If you can wait, ${bestTime.label} will be noticeably quieter.`,
      `Getting busy. You'll save time visiting at ${bestTime.label}.`,
    ],
    Low: [
      `Great time to go! Crowd levels are low – head over now.`,
      `AI predicts a calm window right now. Perfect moment to visit ${place.name}.`,
    ],
  };
  const set = tips[currentCrowd.level];
  const idx = (place.id.charCodeAt(0) + new Date().getMinutes()) % set.length;
  return set[idx];
}

/** Format hour number to display label */
export function formatHour(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m === 0 ? "00" : "30"} ${suffix}`;
}

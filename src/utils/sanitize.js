/**
 * Input sanitization utilities.
 * All user-supplied strings must pass through these helpers before being
 * stored, displayed, or sent to Firebase to prevent XSS and injection attacks.
 */

/** Crowd level values accepted by the system. */
export const VALID_LEVELS = ["Low", "Medium", "High"];

/** Maximum character length enforced on imported place names. */
const MAX_PLACE_NAME_LENGTH = 80;

/**
 * Strip HTML tags and dangerous characters from a user-supplied place name.
 * Trims whitespace and enforces a maximum length.
 *
 * @param {string} str - Raw user input.
 * @returns {string} Sanitized string safe for storage and display.
 */
export function sanitizePlaceName(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // strip script blocks including content
    .replace(/<[^>]*>/g, "")        // strip remaining HTML tags
    .replace(/[<>&"'`]/g, "")       // strip stray XSS characters
    .replace(/javascript:/gi, "")   // strip javascript: URI schemes
    .trim()
    .slice(0, MAX_PLACE_NAME_LENGTH);
}

/**
 * Validate a crowd report level against the allowed enum values.
 * Returns the level unchanged if valid, or null if invalid.
 *
 * @param {string} level - The level string to validate.
 * @returns {string|null} The sanitized level or null.
 */
export function sanitizeReportLevel(level) {
  if (VALID_LEVELS.includes(level)) return level;
  return null;
}

/**
 * Validate that a placeId is a safe, non-empty string.
 * Rejects empty values and strings containing HTML metacharacters.
 *
 * @param {string} id - The placeId to validate.
 * @returns {boolean} True if the id is usable, false otherwise.
 */
export function isValidPlaceId(id) {
  if (typeof id !== "string" || id.trim().length === 0) return false;
  if (/<|>|&|"/.test(id)) return false;
  return true;
}

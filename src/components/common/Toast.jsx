import React from "react";

/**
 * Accessible toast notification container.
 * Uses aria-live so screen readers announce messages without requiring focus.
 * Returns null when there is no active message to keep the DOM clean.
 *
 * @param {{ message: string|null }} props
 */
export function Toast({ message }) {
  if (!message) return null;

  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

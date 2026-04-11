import React, { useEffect, useState } from "react";

/**
 * Typewriter animation component that cycles through an array of words.
 * Each word is typed out character-by-character, held at full length,
 * then deleted — before moving to the next word in the list.
 *
 * @param {{
 *   words: string[],
 *   delay?: number,
 *   typingSpeed?: number,
 *   deletingSpeed?: number
 * }} props
 */
export function TypewriterText({ words, delay = 2000, typingSpeed = 100, deletingSpeed = 50 }) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (pause) return;

    // Finished typing the current word — pause before deleting.
    if (subIndex === words[index].length + 1 && !reverse) {
      setPause(true);
      const timer = setTimeout(() => {
        setReverse(true);
        setPause(false);
      }, delay);
      return () => clearTimeout(timer);
    }

    // Finished deleting — move to the next word.
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(
      () => setSubIndex((prev) => prev + (reverse ? -1 : 1)),
      reverse ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, pause, words, delay, typingSpeed, deletingSpeed]);

  return (
    <span
      className="typewriter-container"
      aria-live="polite"
      aria-label={words[index]}
    >
      {/* Visual typewriter text — hidden from A11y tree since aria-label provides the full word */}
      <span aria-hidden="true">{words[index].substring(0, subIndex)}</span>
      <span className="typewriter-cursor" aria-hidden="true" />
    </span>
  );
}

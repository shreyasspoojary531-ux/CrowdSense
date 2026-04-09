import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(value, duration = 700) {
  const [displayValue, setDisplayValue] = useState(value);
  const frameRef = useRef(0);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const delta = value - startValue;

    if (delta === 0) {
      previousValueRef.current = value;
      return undefined;
    }

    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + delta * eased);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(step);
      } else {
        previousValueRef.current = value;
      }
    };

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [duration, value]);

  useEffect(() => {
    previousValueRef.current = displayValue;
  }, [displayValue]);

  return displayValue;
}

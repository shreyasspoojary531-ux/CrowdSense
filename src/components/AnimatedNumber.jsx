import React from "react";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";

export function AnimatedNumber({
  value,
  duration = 700,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  formatter,
}) {
  const animatedValue = useAnimatedNumber(value, duration);

  const formattedValue = formatter
    ? formatter(animatedValue)
    : animatedValue.toFixed(decimals);

  return <span className={className}>{`${prefix}${formattedValue}${suffix}`}</span>;
}

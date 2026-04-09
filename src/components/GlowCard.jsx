import React, { useEffect, useRef } from "react";

const glowColorMap = {
  orange: { base: "#FF7A00", spread: "rgba(255, 122, 0, 0.06)" },
  emerald: { base: "#10B981", spread: "rgba(16, 185, 129, 0.06)" },
};

export const GlowCard = ({
  children,
  className = "",
  glowColor = "orange",
  customSize = true,
}) => {
  const { base, spread } = glowColorMap[glowColor] || glowColorMap.orange;
  const cardRef = useRef(null);

  useEffect(() => {
    const syncPointer = (e) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const xPos = x - rect.left;
        const yPos = y - rect.top;
        cardRef.current.style.setProperty("--x", `${xPos}px`);
        cardRef.current.style.setProperty("--y", `${yPos}px`);
      }
    };
    document.addEventListener("pointermove", syncPointer);
    return () => document.removeEventListener("pointermove", syncPointer);
  }, []);

  const sizeClass = customSize ? "glow-card-custom" : "";

  return (
    <div
      ref={cardRef}
      className={`relative group rounded-[20px] bg-[var(--glass-bg)] border border-[var(--glass-border)] transition-all duration-300 hover:border-[#FF7A00]/50 hover:shadow-[0_0_10px_rgba(255,122,0,0.3)] overflow-hidden ${sizeClass} ${className}`}
    >
      {/* Subtle dynamic background glow following cursor */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(400px circle at var(--x, 0px) var(--y, 0px), rgba(255, 122, 0, 0.06), transparent 40%)"
        }}
      />
      
      {/* Container for children */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

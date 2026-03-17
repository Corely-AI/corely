import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 16 },
    md: { icon: 32, text: 20 },
    lg: { icon: 40, text: 24 },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-accent drop-shadow-[0_0_8px_rgba(var(--accent),0.5)]"
      >
        {/* Modern Rounded Container */}
        <rect x="2" y="2" width="36" height="36" rx="12" fill="currentColor" fillOpacity="0.1" />
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.2"
        />

        {/* New Modern C - Outer Stroke */}
        <path
          d="M 28 12 C 24 10 16 10 12 14 C 8 18 8 22 12 26 C 16 30 24 30 28 28"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* New Modern C - Inner Stroke */}
        <path
          d="M 24 16 C 20 14 16 14 14 16 C 12 18 12 22 14 24 C 16 26 20 26 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Connector Dots */}
        <circle cx="28" cy="12" r="2.5" fill="currentColor" />
        <circle cx="28" cy="28" r="2.5" fill="currentColor" />
      </svg>

      {showText && (
        <span className="font-bold text-foreground" style={{ fontSize: text }}>
          Corely
        </span>
      )}
    </div>
  );
}

// Static SVG silhouette matching the 3D book-stack scene. Used while the
// R3F chunk is loading, and as the permanent render if WebGL/Canvas fails.
export function HeroSceneFallback({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hs-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#163E6C" />
          <stop offset="100%" stopColor="#0B2545" />
        </linearGradient>
        <linearGradient id="hs-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E6BA3D" />
          <stop offset="100%" stopColor="#C29322" />
        </linearGradient>
      </defs>

      {/* bottom book */}
      <g transform="translate(160 208) rotate(-6)">
        <path
          d="M-92 -14 L92 -14 L78 18 L-78 18 Z"
          fill="url(#hs-navy)"
          opacity="0.92"
        />
      </g>

      {/* middle book (pages) */}
      <g transform="translate(160 180) rotate(4)">
        <path
          d="M-80 -12 L80 -12 L68 16 L-68 16 Z"
          fill="#F7F9FC"
          opacity="0.9"
        />
      </g>

      {/* top book — gold accent */}
      <g transform="translate(160 150) rotate(-3)">
        <path
          d="M-64 -10 L64 -10 L54 14 L-54 14 Z"
          fill="url(#hs-gold)"
        />
      </g>

      {/* bookmark ribbon */}
      <path
        d="M182 100 L182 158 L172 148 L162 158 L162 100 Z"
        fill="#D4A72C"
        opacity="0.85"
      />
    </svg>
  );
}

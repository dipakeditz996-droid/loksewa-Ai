import React from 'react';

export function LoksewaBadgeIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className} 
      {...props}
    >
      {/* Outer subtle gold emblem circle */}
      <circle cx="12" cy="12" r="11" stroke="#D4A72C" strokeOpacity="0.3" strokeWidth="1" />
      
      {/* Subtle blue glow behind center node */}
      <circle cx="12" cy="8" r="4" fill="#163E6B" opacity="0.1" stroke="none" />
      
      {/* Open Book Pages */}
      <path d="M5.5 18.5A1.5 1.5 0 0 1 7 17h5" stroke="#D4A72C" />
      <path d="M18.5 18.5A1.5 1.5 0 0 0 17 17h-5" stroke="#D4A72C" />
      <path d="M7 4h5v13H7a1.5 1.5 0 0 0-1.5 1.5v-13A1.5 1.5 0 0 1 7 4z" stroke="#D4A72C" />
      <path d="M17 4h-5v13h5a1.5 1.5 0 0 1 1.5 1.5v-13A1.5 1.5 0 0 0 17 4z" stroke="#D4A72C" />

      {/* AI / Neural Nodes integrated into the center spine area */}
      {/* Center node */}
      <circle cx="12" cy="8" r="1.2" fill="#D4A72C" stroke="none" />
      {/* Left node */}
      <circle cx="9" cy="6" r="0.8" fill="#163E6B" stroke="#D4A72C" strokeWidth="1" />
      {/* Right node */}
      <circle cx="15" cy="6" r="0.8" fill="#163E6B" stroke="#D4A72C" strokeWidth="1" />
      {/* Bottom node */}
      <circle cx="12" cy="12" r="0.8" fill="#163E6B" stroke="#D4A72C" strokeWidth="1" />
      
      {/* Neural connections */}
      <path d="M9.5 6.5l2 1" stroke="#D4A72C" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M14.5 6.5l-2 1" stroke="#D4A72C" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M12 9.5v1.5" stroke="#D4A72C" strokeOpacity="0.7" strokeWidth="1" />
      
      {/* Subtle geometric detail inspired by Nepal (small mountain/triangle peak) at top */}
      <path d="M12 2.5l-1.5 2h3z" fill="#D4A72C" stroke="none" opacity="0.6" />
    </svg>
  );
}

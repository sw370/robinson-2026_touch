import React from 'react';

interface ItemIllustrationProps {
  itemId: string;
  className?: string;
}

export const ItemIllustration: React.FC<ItemIllustrationProps> = ({ itemId, className = 'h-20 w-auto' }) => {
  switch (itemId) {
    case 'rifle':
      // Horizontal flintlock musket / rifle
      return (
        <svg viewBox="0 0 320 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Wooden stock */}
          <path
            d="M10 38 C25 36 50 35 75 32 L150 28 L300 27 L300 24 L145 24 L75 27 C45 27 20 25 10 30 Z"
            fill="#5c3a21"
            stroke="#8b5a2b"
            strokeWidth="1.5"
          />
          {/* Metal long barrel */}
          <path d="M120 24 L308 24 L308 27 L120 27 Z" fill="#888" stroke="#aaa" strokeWidth="1" />
          <circle cx="308" cy="25.5" r="2" fill="#333" />
          {/* Brass barrel bands */}
          <rect x="160" y="23" width="5" height="5" fill="#d97706" rx="1" />
          <rect x="220" y="23" width="5" height="5" fill="#d97706" rx="1" />
          <rect x="270" y="23" width="5" height="5" fill="#d97706" rx="1" />
          {/* Flintlock mechanism & hammer */}
          <path d="M98 22 L112 22 L110 28 L95 28 Z" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" />
          <path d="M102 22 L100 16 L106 14 L107 18 L104 22 Z" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" />
          {/* Trigger guard and trigger */}
          <path d="M85 32 C85 40 98 40 98 30" stroke="#d97706" strokeWidth="1.5" fill="none" />
          <path d="M92 32 L90 36" stroke="#4b5563" strokeWidth="1.5" />
          {/* Brass butt plate */}
          <path d="M10 30 C8 32 8 36 10 38 L14 38 L14 30 Z" fill="#d97706" />
        </svg>
      );

    case 'telescope':
      // Horizontal maritime brass spyglass telescope
      return (
        <svg viewBox="0 0 240 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Objective lens section (widest) */}
          <path d="M25 15 L75 18 L75 42 L25 45 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="1.5" />
          <rect x="18" y="13" width="8" height="34" rx="2" fill="#b45309" stroke="#d97706" strokeWidth="1" />
          <ellipse cx="20" cy="30" rx="3" ry="14" fill="#38bdf8" fillOpacity="0.7" />
          {/* Second draw tube */}
          <rect x="75" y="20" width="50" height="20" fill="#92400e" stroke="#d97706" strokeWidth="1" />
          {/* Third draw tube */}
          <rect x="125" y="22" width="45" height="16" fill="#b45309" stroke="#f59e0b" strokeWidth="1" />
          {/* Fourth draw tube & eyepiece */}
          <rect x="170" y="24" width="40" height="12" fill="#d97706" stroke="#f59e0b" strokeWidth="1" />
          <rect x="210" y="22" width="10" height="16" rx="2" fill="#78350f" stroke="#d97706" strokeWidth="1" />
          <ellipse cx="220" cy="30" rx="2" ry="7" fill="#38bdf8" fillOpacity="0.8" />
          {/* Decorative brass rings */}
          <line x1="75" y1="18" x2="75" y2="42" stroke="#fef08a" strokeWidth="2" />
          <line x1="125" y1="20" x2="125" y2="40" stroke="#fef08a" strokeWidth="2" />
          <line x1="170" y1="22" x2="170" y2="38" stroke="#fef08a" strokeWidth="2" />
        </svg>
      );

    case 'map':
      // Horizontal spread antique sea map
      return (
        <svg viewBox="0 0 180 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Aged parchment sheet */}
          <path
            d="M15 15 C30 12 60 16 90 13 C120 10 150 14 165 16 C163 32 166 48 163 60 C145 62 115 57 85 61 C55 64 25 59 13 61 C16 46 12 30 15 15 Z"
            fill="#d7b889"
            stroke="#8c6239"
            strokeWidth="1.5"
          />
          {/* Shoreline and islands */}
          <path d="M35 28 C45 25 55 35 65 30 C75 25 80 40 70 45 C60 50 45 42 35 48 Z" fill="#c49a6c" stroke="#6e4720" strokeWidth="1" />
          <ellipse cx="125" cy="32" rx="12" ry="7" fill="#c49a6c" stroke="#6e4720" strokeWidth="1" />
          <circle cx="145" cy="45" r="4" fill="#c49a6c" stroke="#6e4720" strokeWidth="0.8" />
          {/* Navigation rhumb lines & compass rose */}
          <line x1="95" y1="20" x2="115" y2="45" stroke="#8c6239" strokeWidth="0.75" strokeDasharray="2,2" />
          <line x1="80" y1="45" x2="125" y2="22" stroke="#8c6239" strokeWidth="0.75" strokeDasharray="2,2" />
          <circle cx="100" cy="35" r="5" stroke="#b45309" strokeWidth="1" />
        </svg>
      );

    case 'lantern':
      // Antique kerosene oil lantern
      return (
        <svg viewBox="0 0 100 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Handle */}
          <path d="M32 25 C32 10 68 10 68 25" stroke="#92400e" strokeWidth="2.5" fill="none" />
          {/* Top cap */}
          <ellipse cx="50" cy="25" rx="14" ry="4" fill="#b45309" stroke="#d97706" strokeWidth="1" />
          <rect x="42" y="18" width="16" height="7" rx="2" fill="#78350f" stroke="#b45309" strokeWidth="1" />
          {/* Glass chimney with flame glow */}
          <ellipse cx="50" cy="46" rx="16" ry="18" fill="#fef08a" fillOpacity="0.4" stroke="#d97706" strokeWidth="1.5" />
          <path d="M50 38 Q54 46 50 54 Q46 46 50 38 Z" fill="#f59e0b" />
          <circle cx="50" cy="48" r="3" fill="#ffffff" />
          {/* Base */}
          <rect x="36" y="62" width="28" height="10" rx="3" fill="#78350f" stroke="#b45309" strokeWidth="1.5" />
          <ellipse cx="50" cy="72" rx="18" ry="4" fill="#92400e" stroke="#d97706" strokeWidth="1" />
        </svg>
      );

    case 'compass':
      // Mariner's brass pocket compass
      return (
        <svg viewBox="0 0 110 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Brass casing */}
          <circle cx="55" cy="42" r="30" fill="#78350f" stroke="#d97706" strokeWidth="2" />
          <circle cx="55" cy="42" r="26" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
          {/* Degree markings */}
          <circle cx="55" cy="42" r="23" stroke="#92400e" strokeWidth="0.8" strokeDasharray="2,3" />
          {/* Compass rose needle */}
          <polygon points="55,20 59,42 55,40" fill="#dc2626" />
          <polygon points="55,20 51,42 55,40" fill="#ef4444" />
          <polygon points="55,64 59,42 55,44" fill="#1e3a8a" />
          <polygon points="55,64 51,42 55,44" fill="#3b82f6" />
          <circle cx="55" cy="42" r="3" fill="#d97706" stroke="#78350f" strokeWidth="1" />
          {/* Top brass loop */}
          <circle cx="55" cy="10" r="5" stroke="#d97706" strokeWidth="2" fill="none" />
        </svg>
      );

    case 'rope':
      // Coiled nautical hemp rope
      return (
        <svg viewBox="0 0 140 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Multiple rope loops coiled horizontally */}
          <ellipse cx="70" cy="35" rx="48" ry="22" stroke="#92400e" strokeWidth="6" strokeDasharray="6,4" fill="none" />
          <ellipse cx="70" cy="34" rx="42" ry="18" stroke="#b45309" strokeWidth="6" strokeDasharray="6,4" fill="none" />
          <ellipse cx="70" cy="33" rx="35" ry="14" stroke="#d97706" strokeWidth="5" strokeDasharray="6,4" fill="none" />
          {/* Binding knot */}
          <rect x="63" y="14" width="14" height="42" rx="3" fill="#78350f" stroke="#b45309" strokeWidth="1.5" />
          <line x1="63" y1="22" x2="77" y2="22" stroke="#d97706" strokeWidth="2" />
          <line x1="63" y1="30" x2="77" y2="30" stroke="#d97706" strokeWidth="2" />
          <line x1="63" y1="38" x2="77" y2="38" stroke="#d97706" strokeWidth="2" />
          <line x1="63" y1="46" x2="77" y2="46" stroke="#d97706" strokeWidth="2" />
        </svg>
      );

    case 'chest':
      // Antique wooden sea chest
      return (
        <svg viewBox="0 0 140 75" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chest base */}
          <rect x="20" y="32" width="100" height="36" rx="3" fill="#5c3a21" stroke="#3d2412" strokeWidth="1.5" />
          {/* Curved lid */}
          <path d="M20 32 C20 18 120 18 120 32 Z" fill="#78350f" stroke="#3d2412" strokeWidth="1.5" />
          {/* Metal reinforcing straps */}
          <rect x="36" y="21" width="7" height="47" fill="#d97706" stroke="#92400e" strokeWidth="1" />
          <rect x="97" y="21" width="7" height="47" fill="#d97706" stroke="#92400e" strokeWidth="1" />
          {/* Rim band */}
          <rect x="18" y="30" width="104" height="4" fill="#b45309" stroke="#78350f" strokeWidth="1" />
          {/* Lock hasp and escutcheon */}
          <rect x="65" y="28" width="10" height="14" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="1" />
          <circle cx="70" cy="36" r="1.5" fill="#1c1917" />
        </svg>
      );

    default:
      return null;
  }
};

import React from 'react';
import { VocabularyItem } from '../types';
import { playWoodClick } from '../services/audioService';

interface CaveInteractiveMapProps {
  vocabulary: VocabularyItem[];
  studiedIds?: string[];
  activeItemId?: string | null;
  onSelectObject: (item: VocabularyItem) => void;
  disabled?: boolean;
  highlightOnlyId?: string;
  showHints?: boolean;
  calibrateMode?: boolean;
  onUpdateHitbox?: (itemId: string, newHitbox: any) => void;
  className?: string;
}

// Organic contour SVG paths for the 7 items on the 1920x1080 cave artwork
const ITEM_GLOW_CONTOURS: Record<string, { path: string }> = {
  // 1. Flintlock Musket / Rifle leaning against left side of table
  rifle: {
    path: 'M 680,415 L 704,425 L 678,540 L 658,650 L 642,760 L 652,790 L 634,830 L 608,830 L 590,930 L 558,1040 L 526,1030 L 558,910 L 588,760 L 622,620 L 652,490 Z',
  },

  // 2. Oil Lantern on table
  lantern: {
    path: 'M 755,270 C 740,270 735,290 735,310 L 710,360 L 685,420 L 680,520 L 690,570 L 795,570 L 805,520 L 800,420 L 775,360 L 750,310 C 750,290 745,270 755,270 Z',
  },

  // 3. Mariner's Compass in wooden box on table
  compass: {
    path: 'M 620,580 L 700,565 L 790,605 L 785,680 L 705,710 L 620,680 Z',
  },

  // 4. Parchment Sea Map spread on table
  map: {
    path: 'M 780,560 Q 950,565 1220,585 Q 1250,620 1240,680 Q 1020,705 780,715 Q 730,715 700,705 Q 715,640 730,590 Z',
  },

  // 5. Brass Telescope on tripod stand
  telescope: {
    path: 'M 1080,350 L 1110,395 L 1220,430 L 1290,460 L 1315,450 L 1300,425 L 1200,385 L 1100,340 Z M 1180,430 L 1135,595 M 1210,435 L 1255,590 M 1195,435 L 1190,570',
  },

  // 6. Hemp Rope coiled hanging under table
  rope: {
    path: 'M 785,745 C 755,770 735,820 735,890 C 735,960 760,1030 790,1030 C 820,1030 855,970 855,890 C 855,820 825,770 795,745 Z M 785,790 C 770,820 760,860 760,910 C 760,960 775,995 790,995 C 805,995 825,960 825,910 C 825,860 810,820 795,790 Z',
  },

  // 7. Wooden Sea Chest on floor
  chest: {
    path: 'M 1210,840 Q 1340,780 1650,815 L 1670,920 L 1660,1045 L 1210,1055 L 1200,940 Z',
  },
};

export const CaveInteractiveMap: React.FC<CaveInteractiveMapProps> = ({
  vocabulary,
  studiedIds = [],
  activeItemId,
  onSelectObject,
  disabled = false,
  className = '',
}) => {
  const handleItemTouch = (item: VocabularyItem, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (disabled) return;
    playWoodClick();
    onSelectObject(item);
  };

  return (
    <div
      className={`relative w-full aspect-video select-none overflow-hidden rounded-3xl shadow-2xl border border-amber-900/30 bg-black ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Cave Artwork Background */}
      <img
        src="/assets/cave.jpg"
        alt="Пещера Робинзона"
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Atmospheric Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/30" />

      {/* SVG Glowing Organic Contours for Items */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Default warm golden amber glow */}
          <filter id="cave-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Active tapped item glow */}
          <filter id="cave-glow-active" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Studied item soft emerald glow */}
          <filter id="cave-glow-studied" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {vocabulary.map((item) => {
          const contour = ITEM_GLOW_CONTOURS[item.id];
          if (!contour) return null;

          const isStudied = studiedIds.includes(item.id);
          const isActive = activeItemId === item.id;

          const strokeColor = isActive ? '#fbbf24' : isStudied ? '#34d399' : '#f59e0b';
          const fillColor = isActive
            ? 'rgba(251, 191, 36, 0.22)'
            : isStudied
            ? 'rgba(52, 211, 153, 0.08)'
            : 'rgba(245, 158, 11, 0.08)';
          const filterId = isActive
            ? 'url(#cave-glow-active)'
            : isStudied
            ? 'url(#cave-glow-studied)'
            : 'url(#cave-glow)';

          return (
            <g key={item.id} className="transition-all duration-300">
              <path
                d={contour.path}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isActive ? '4' : '2.5'}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter={filterId}
              />
            </g>
          );
        })}
      </svg>

      {/* Invisible Touch Hitboxes (Calculated independently, no visible borders or text for visitor) */}
      {vocabulary.map((item) => {
        const { x, y, width, height } = item.hitbox;

        return (
          <button
            key={item.id}
            type="button"
            onClick={(e) => handleItemTouch(item, e)}
            disabled={disabled}
            aria-label={item.english}
            className="absolute z-20 cursor-pointer rounded-2xl bg-transparent border-0 outline-none focus:outline-none transition-transform duration-150 active:scale-95"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          />
        );
      })}
    </div>
  );
};

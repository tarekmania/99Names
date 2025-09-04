import { useState } from 'react';
import { DivineName } from '@/data/names';
import { cn } from '@/lib/utils';

interface TileProps {
  name: DivineName;
  isFound: boolean;
  isRevealed: boolean;
  showArabic?: boolean;
  showMeaning?: boolean;
  isRecentMatch?: boolean;
}

export function Tile({ 
  name, 
  isFound, 
  isRevealed, 
  showArabic = true, 
  showMeaning = false,
  isRecentMatch = false 
}: TileProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleLongPress = () => {
    if (showMeaning && (isFound || isRevealed)) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    }
  };

  const shouldShow = isFound || isRevealed;
  const isMissed = isRevealed && !isFound;

  return (
    <div className="relative">
      <div 
        className={cn(
          "relative aspect-square rounded-lg border-2 transition-all duration-500 cursor-default",
          "flex flex-col items-center justify-center p-2 sm:p-3 min-h-[70px] sm:min-h-[80px] md:min-h-[90px]",
          !shouldShow && "bg-muted border-border shadow-soft",
          isFound && "bg-success border-success text-success-foreground shadow-medium",
          isMissed && "bg-destructive border-destructive text-destructive-foreground shadow-medium",
          isRecentMatch && "animate-pulse scale-105"
        )}
        onMouseEnter={() => showMeaning && shouldShow && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={handleLongPress}
        role="gridcell"
        aria-label={shouldShow ? `${name.englishName} - ${name.arabic}` : `Hidden name ${name.id}`}
      >
        {!shouldShow ? (
          <span className="text-xs font-mono text-muted-foreground select-none">
            {name.id}
          </span>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-1 w-full">
            <div className="text-xs font-semibold leading-tight break-words max-w-full">
              {name.englishName}
            </div>
            {showArabic && (
              <div className="text-xs opacity-80 leading-tight font-arabic">
                {name.arabic}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip for meanings */}
      {showTooltip && showMeaning && shouldShow && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-strong border border-border">
            {name.meanings}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
          </div>
        </div>
      )}
    </div>
  );
}

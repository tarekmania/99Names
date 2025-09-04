import { useEffect, useState } from 'react';
import { NAMES } from '@/data/names';
import { useGameStore } from '@/store/game';
import { Tile } from './Tile';

interface GameGridProps {
  showArabic?: boolean;
  showMeaning?: boolean;
}

export function GameGrid({ showArabic = true, showMeaning = false }: GameGridProps) {
  const { foundIds, isOver, recentMatch, clearFeedback } = useGameStore();
  const [announcedName, setAnnouncedName] = useState<string>('');

  // Clear recent match feedback after animation
  useEffect(() => {
    if (recentMatch) {
      const timer = setTimeout(clearFeedback, 1000);
      return () => clearTimeout(timer);
    }
  }, [recentMatch, clearFeedback]);

  // ARIA announcements for found names
  useEffect(() => {
    if (recentMatch) {
      const name = NAMES.find(n => n.id === recentMatch);
      if (name) {
        const announcement = `Found: ${name.englishName} (${name.arabic})`;
        setAnnouncedName(announcement);
        
        // Clear announcement after screen reader reads it
        const timer = setTimeout(() => setAnnouncedName(''), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [recentMatch]);

  // Create grid with empty cells to make it 10x10
  const gridItems = Array.from({ length: 100 }, (_, index) => {
    if (index < 99) {
      const name = NAMES[index];
      return (
        <Tile
          key={name.id}
          name={name}
          isFound={foundIds.has(name.id)}
          isRevealed={isOver}
          showArabic={showArabic}
          showMeaning={showMeaning}
          isRecentMatch={recentMatch === name.id}
        />
      );
    }
    return <div key={`empty-${index}`} className="aspect-square" />; // Empty cell
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* ARIA live region for announcements */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {announcedName}
      </div>

      <div 
        className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-3 sm:gap-4 md:gap-5"
        role="grid"
        aria-label="99 Names of Allah grid"
      >
        {gridItems}
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <div className="flex justify-center space-x-6">
          <span className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Found ({foundIds.size})</span>
          </span>
          {isOver && (
            <span className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Missed ({99 - foundIds.size})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

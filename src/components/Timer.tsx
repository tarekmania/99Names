import { useEffect } from 'react';
import { useGameStore } from '@/store/game';
import { cn } from '@/lib/utils';

export function Timer() {
  const { remainingMs, tick, isPlaying } = useGameStore();

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, tick]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isLow = remainingMs <= 2 * 60 * 1000; // 2 minutes
  const isCritical = remainingMs <= 30 * 1000; // 30 seconds

  return (
    <div className="sticky top-4 z-50 flex justify-center">
      <div 
        className={cn(
          "px-6 py-3 rounded-xl font-mono text-2xl font-bold shadow-medium transition-all duration-300",
          "bg-card text-card-foreground border border-border",
          isLow && !isCritical && "bg-warning text-warning-foreground border-warning shadow-glow",
          isCritical && "bg-destructive text-destructive-foreground border-destructive shadow-glow animate-pulse"
        )}
      >
        {timeString}
      </div>
    </div>
  );
}
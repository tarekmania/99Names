import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Calendar } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  bestStreak: number;
  todayCompleted: boolean;
}

export function StreakDisplay({ currentStreak, bestStreak, todayCompleted }: StreakDisplayProps) {
  const isOnFire = currentStreak >= 7;
  const isLegendary = currentStreak >= 30;

  return (
    <Card className={`
      transition-all duration-300 
      ${isLegendary ? 'bg-gradient-accent shadow-glow' :
        isOnFire ? 'bg-gradient-primary shadow-medium' : 'shadow-soft'}
    `}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className={`w-5 h-5 ${
            isLegendary ? 'text-accent-foreground' :
            isOnFire ? 'text-primary-foreground' : 'text-primary'
          }`} />
          Daily Streak
          {todayCompleted && (
            <Badge variant="secondary" className="ml-auto">
              <Calendar className="w-3 h-3 mr-1" />
              Today ✓
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`
            text-4xl font-bold mb-1
            ${isLegendary ? 'text-accent-foreground gradient-text' :
              isOnFire ? 'text-primary-foreground' : 'text-foreground'}
          `}>
            {currentStreak}
          </div>
          <p className={`
            text-sm font-medium
            ${isLegendary ? 'text-accent-foreground/80' :
              isOnFire ? 'text-primary-foreground/80' : 'text-muted-foreground'}
          `}>
            {currentStreak === 1 ? 'day' : 'days'} in a row
          </p>
        </div>

        {currentStreak > 0 && (
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: Math.min(currentStreak, 7) }).map((_, i) => (
              <Flame key={i} className={`w-4 h-4 ${
                isLegendary ? 'text-accent-foreground' :
                isOnFire ? 'text-primary-foreground' : 'text-primary'
              }`} />
            ))}
            {currentStreak > 7 && (
              <span className={`
                text-xs font-bold ml-1
                ${isLegendary ? 'text-accent-foreground' :
                  isOnFire ? 'text-primary-foreground' : 'text-foreground'}
              `}>
                +{currentStreak - 7}
              </span>
            )}
          </div>
        )}

        {bestStreak > currentStreak && (
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Best</span>
            </div>
            <span className="text-sm font-semibold">{bestStreak} days</span>
          </div>
        )}

        {isLegendary && (
          <Badge className="w-full justify-center bg-accent/20 text-accent-foreground border-accent/30">
            🏆 Legendary Streak!
          </Badge>
        )}
        
        {isOnFire && !isLegendary && (
          <Badge className="w-full justify-center bg-primary/20 text-primary-foreground border-primary/30">
            🔥 On Fire!
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
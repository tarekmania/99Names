import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface DailyTimerProps {
  timeLeft: number;
  totalTime?: number;
  isActive: boolean;
}

export function DailyTimer({ timeLeft, totalTime = 5 * 60, isActive }: DailyTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeLeft);

  useEffect(() => {
    setDisplayTime(timeLeft);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const isLowTime = timeLeft <= 60;
  const isCriticalTime = timeLeft <= 30;

  return (
    <Card className={`
      transition-all duration-300 
      ${isCriticalTime ? 'shadow-glow border-destructive animate-pulse' : 
        isLowTime ? 'border-warning' : 'shadow-soft'}
    `}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${
              isCriticalTime ? 'text-destructive' :
              isLowTime ? 'text-warning' : 'text-primary'
            }`} />
            <span className="font-medium text-sm text-muted-foreground">
              Daily Practice Time
            </span>
          </div>
          
          <div className={`
            text-2xl font-bold tabular-nums
            ${isCriticalTime ? 'text-destructive' :
              isLowTime ? 'text-warning' : 'text-foreground'}
          `}>
            {formatTime(displayTime)}
          </div>
        </div>

        <Progress 
          value={progress} 
          className={`h-2 ${
            isCriticalTime ? '[&>div]:bg-destructive' :
            isLowTime ? '[&>div]:bg-warning' : '[&>div]:bg-primary'
          }`}
        />

        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>0:00</span>
          <span>{formatTime(totalTime)}</span>
        </div>
        
        {!isActive && (
          <div className="text-center mt-3">
            <span className="text-sm font-medium text-muted-foreground">
              {timeLeft === 0 ? 'Time\'s up!' : 'Completed!'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/game';
import { Timer } from '@/components/Timer';
import { GameGrid } from '@/components/GameGrid';
import { StatusMessage } from '@/components/StatusMessage';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, Send, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Play() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    isPlaying,
    isOver,
    input,
    foundIds,
    submissions,
    wrongInput,
    statusMessage,
    recentFoundName,
    names,
    isLoading,
    loadNames,
    startGame,
    submitGuess,
    revealNow,
    setInput,
    clearFeedback,
    clearStatusMessage,
  } = useGameStore();

  // Load names and auto-focus input and start game when component mounts
  useEffect(() => {
    loadNames().then(() => {
      if (!isPlaying && !isOver) {
        startGame();
      }
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });
  }, [isPlaying, isOver, startGame, loadNames]);

  // Navigate to end summary when game is over
  useEffect(() => {
    if (isOver) {
      const timer = setTimeout(() => {
        navigate('/end-summary');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOver, navigate]);

  // Clear wrong input feedback with improved animation duration
  useEffect(() => {
    if (wrongInput) {
      const timer = setTimeout(clearFeedback, 1000);
      return () => clearTimeout(timer);
    }
  }, [wrongInput, clearFeedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isOver) {
      submitGuess();
    }
  };

  const accuracy = submissions > 0 ? Math.round((foundIds.size / submissions) * 100) : 0;
  const successfulFinds = foundIds.size;
  const failedAttempts = submissions - foundIds.size;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Divine Names...</div>
          <div className="text-muted-foreground">Fetching authentic Arabic text...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with timer and back button */}
      <div className="sticky top-0 z-50 bg-gradient-subtle border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Button>
            
            <Timer />
            
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{foundIds.size}/{names.length}</span>
              </div>
              <ProgressBar current={foundIds.size} total={names.length} className="w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Input section */}
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a name... (e.g., Rahman)"
                  disabled={isOver}
                  className={cn(
                    "text-lg transition-all duration-300",
                    wrongInput && "animate-[shake_0.5s_ease-in-out] border-destructive shadow-destructive/20 shadow-md",
                    recentFoundName && "border-success shadow-success/20 shadow-md"
                  )}
                  aria-label="Enter the name of Allah"
                />
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isOver}
                size="lg"
                className="px-6"
              >
                <Send className="w-4 h-4" />
                <span className="sr-only">Submit guess</span>
              </Button>
            </div>
            
            {/* Status Message */}
            <StatusMessage
              type={statusMessage?.type || null}
              message={statusMessage?.text || ''}
              onClear={clearStatusMessage}
            />
          </form>

          {/* Enhanced Stats and reveal button */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
            <div className="flex items-center space-x-4 bg-card rounded-lg px-4 py-2 border">
              <span className="text-muted-foreground">
                ✅ Found: <span className="font-semibold text-success">{successfulFinds}</span>
              </span>
              {failedAttempts > 0 && (
                <span className="text-muted-foreground">
                  ❌ Missed: <span className="font-semibold text-destructive">{failedAttempts}</span>
                </span>
              )}
              {submissions > 0 && (
                <span className="text-muted-foreground">
                  🎯 Accuracy: <span className="font-semibold text-primary">{accuracy}%</span>
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={revealNow}
              disabled={isOver}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Reveal All
            </Button>
          </div>
        </div>

        {/* Game grid */}
        <GameGrid showArabic={true} showMeaning={false} />

        {/* Instructions */}
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Type the English names of Allah (e.g., "Rahman", "Rahim"). 
            The matching is forgiving - try variations like "ar-rahman" or "rahmaan".
            Found names will appear in <span className="text-success font-semibold">green</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
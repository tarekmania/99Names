import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSpacedRepetitionStore } from '@/store/spacedRepetition';
import { useSettings } from '@/hooks/useSettings';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { Brain, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';

interface SpacedRepetitionSessionProps {
  onComplete: () => void;
}

export const SpacedRepetitionSession = ({ onComplete }: SpacedRepetitionSessionProps) => {
  const {
    currentSession,
    currentIndex,
    sessionCompleted,
    submitAnswer,
    getCurrentItem,
    resetSession,
  } = useSpacedRepetitionStore();

  const { settings } = useSettings();
  const { playSound } = useAudio();
  const { success: vibrateSuccess, error: vibrateError } = useHaptics();
  
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentItem = getCurrentItem();
  const progress = currentSession.length > 0 ? ((currentIndex + 1) / currentSession.length) * 100 : 0;

  useEffect(() => {
    if (sessionCompleted) {
      onComplete();
    }
  }, [sessionCompleted, onComplete]);

  useEffect(() => {
    // Reset state when moving to next item
    setIsLoading(true);
    setShowAnswer(false);
    setSelectedQuality(null);
    setAnswerRevealed(false);
    
    // Small delay to ensure clean state transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Initial load
  useEffect(() => {
    if (currentItem) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [currentItem]);

  const handleRevealAnswer = () => {
    setShowAnswer(true);
    setAnswerRevealed(true);
  };

  const handleSubmitQuality = (quality: number) => {
    if (!answerRevealed) return;
    
    setSelectedQuality(quality);
    
    // Play feedback sound
    if (settings.soundEffects) {
      playSound(quality >= 3 ? 'correct' : 'incorrect');
    }
    
    // Haptic feedback
    if (settings.haptics) {
      quality >= 3 ? vibrateSuccess() : vibrateError();
    }
    
    // Submit answer immediately to update stats
    submitAnswer(quality);
  };

  const getQualityLabel = (quality: number) => {
    switch (quality) {
      case 0: return 'Complete blackout';
      case 1: return 'Incorrect with effort';
      case 2: return 'Incorrect but familiar';
      case 3: return 'Correct with difficulty';
      case 4: return 'Correct with hesitation';
      case 5: return 'Perfect recall';
      default: return '';
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality < 3) return 'destructive';
    if (quality === 3) return 'secondary';
    if (quality === 4) return 'default';
    return 'default';
  };

  if (sessionCompleted) {
    return (
      <Card className="bg-gradient-accent shadow-glow">
        <CardContent className="text-center py-8">
          <Trophy className="w-12 h-12 text-accent-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-accent-foreground mb-2">
            Spaced Repetition Session Complete!
          </h2>
          <p className="text-accent-foreground/80 mb-6">
            You've completed your review session. Great work on your memorization journey!
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={resetSession} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              New Session
            </Button>
            <Button onClick={onComplete}>
              Back to Daily Practice
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentItem) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Reviews Due</h3>
          <p className="text-muted-foreground mb-4">
            Great job! You're all caught up with your spaced repetition reviews.
          </p>
          <Button onClick={onComplete} variant="outline">
            Back to Daily Practice
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { name } = currentItem;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Review Progress</span>
            <span className="text-sm font-bold">{currentIndex + 1} / {currentSession.length}</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Name #{name.id}
            </CardTitle>
            <Badge variant="outline">Spaced Repetition</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            /* Loading State */
            <div className="text-center space-y-4 py-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
                <div className="h-8 bg-muted rounded w-32 mx-auto"></div>
                <div className="h-6 bg-muted rounded w-40 mx-auto"></div>
              </div>
              <div className="text-sm text-muted-foreground">Loading next name...</div>
            </div>
          ) : (
            <>
              {/* Question */}
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground">What is the meaning of this name?</div>
                <div className="text-2xl font-bold text-primary">
                  {name.arabic}
                </div>
                <div className="text-lg font-semibold">
                  {name.englishName}
                </div>
              </div>

              {/* Reveal Answer Button */}
              {!showAnswer && (
                <div className="text-center">
                  <Button onClick={handleRevealAnswer} size="lg">
                    Reveal Answer
                  </Button>
                </div>
              )}

              {/* Answer - Only render when showAnswer is true */}
              {showAnswer && (
                <div className="bg-muted/50 rounded-lg p-6 space-y-4 animate-in fade-in-50 duration-300">
                  <div className="text-center">
                    <h3 className="font-semibold mb-2 text-primary">Meaning:</h3>
                    <p className="text-lg">{name.meanings}</p>
                  </div>
                </div>
              )}

              {/* Quality Rating - Only render when showAnswer is true */}
              {showAnswer && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">How well did you know this?</h3>
                    <p className="text-sm text-muted-foreground">
                      Rate your recall quality to improve future reviews
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3, 4, 5].map((quality) => (
                      <Button
                        key={quality}
                        variant={selectedQuality === quality ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSubmitQuality(quality)}
                        className={`flex flex-col h-auto py-3 ${
                          selectedQuality === quality ? 'ring-2 ring-primary' : ''
                        }`}
                        disabled={selectedQuality !== null}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {quality >= 3 ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="font-bold">{quality}</span>
                        </div>
                        <span className="text-xs text-center leading-tight">
                          {getQualityLabel(quality)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

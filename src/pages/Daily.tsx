import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DailyTimer } from '@/components/DailyTimer';
import { StreakDisplay } from '@/components/StreakDisplay';
import { NameCard } from '@/components/NameCard';
import { useDailyStore } from '@/store/daily';
import { useSettings } from '@/hooks/useSettings';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { ArrowLeft, Play, RotateCcw, Trophy, Calendar } from 'lucide-react';

const Daily = () => {
  const {
    names,
    found,
    timeLeft,
    isActive,
    isCompleted,
    input,
    currentStreak,
    bestStreak,
    todayCompleted,
    startDaily,
    submitGuess,
    tick,
    setInput,
    resetDaily
  } = useDailyStore();

  const { settings } = useSettings();
  const { playSound } = useAudio();
  const { success: vibrateSuccess, error: vibrateError } = useHaptics();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Timer effect
  useEffect(() => {
    if (!isActive || isCompleted) return;

    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isCompleted, tick]);

  // Initialize daily challenge
  useEffect(() => {
    startDaily();
  }, [startDaily]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isActive || isCompleted) return;

    const success = submitGuess(input.trim());
    
    if (success) {
      playSound('correct');
      vibrateSuccess();
      setFeedback({ type: 'success', message: 'Correct!' });
    } else {
      playSound('incorrect');
      vibrateError();
      setFeedback({ type: 'error', message: 'Try again!' });
    }
    
    setTimeout(() => setFeedback({ type: null, message: '' }), 1500);
  };

  const progress = names.length > 0 ? (found.size / names.length) * 100 : 0;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (todayCompleted && !isActive) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <Button variant="outline" size="sm" asChild className="mb-6">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back Home
              </Link>
            </Button>
            
            <div className="mb-6">
              <Trophy className="w-16 h-16 text-accent mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Daily Practice Completed!</h1>
              <p className="text-muted-foreground">
                You've already completed today's daily practice. Come back tomorrow for a new challenge!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <StreakDisplay 
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              todayCompleted={true}
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Today's Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Names Found:</span>
                    <span className="font-semibold">{found.size} / {names.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion:</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {names.map((name) => (
              <Link key={name.id} to={`/study/${name.id}`}>
                <NameCard
                  name={name}
                  isFound={found.has(name.id)}
                  showProgress={true}
                  className="h-full"
                />
              </Link>
            ))}
          </div>

          <div className="text-center space-y-4">
            <Button onClick={resetDaily} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Practice
            </Button>
            
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link to="/study">
                  Study All Names
                </Link>
              </Button>
              
              <Button asChild variant="outline">
                <Link to="/play">
                  Full Challenge
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back Home
            </Link>
          </Button>
          
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Daily Practice
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Game Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer */}
            <DailyTimer timeLeft={timeLeft} isActive={isActive} />

            {/* Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Progress</span>
                  <span className="text-sm font-bold">{found.size} / {names.length}</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {Math.round(progress)}% Complete
                </p>
              </CardContent>
            </Card>

            {/* Input Form */}
            {isActive && !isCompleted && (
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a name of Allah..."
                        className={`text-lg h-12 ${
                          feedback.type === 'success' ? 'border-success pulse-success' :
                          feedback.type === 'error' ? 'border-destructive shake' : ''
                        }`}
                        autoFocus
                        disabled={!isActive}
                      />
                      {feedback.message && (
                        <div className={`absolute -bottom-6 left-0 text-sm font-medium ${
                          feedback.type === 'success' ? 'text-success' : 'text-destructive'
                        }`}>
                          {feedback.message}
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={!isActive || !input.trim()}>
                      Submit Guess
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Completion Message */}
            {isCompleted && (
              <Card className="bg-gradient-accent shadow-glow">
                <CardContent className="text-center py-8">
                  <Trophy className="w-12 h-12 text-accent-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-accent-foreground mb-2">
                    {found.size === names.length ? 'Perfect!' : 'Time\'s Up!'}
                  </h2>
                  <p className="text-accent-foreground/80 mb-4">
                    You found {found.size} out of {names.length} names
                    {timeLeft > 0 && ` with ${formatTime(timeLeft)} remaining`}
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={resetDaily} variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button asChild>
                      <Link to="/study">
                        Study Names
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Streak & Info */}
          <div className="space-y-6">
            <StreakDisplay 
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              todayCompleted={false}
            />

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Challenge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>5 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Names:</span>
                  <span>15 names</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span>Beginner</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/study">
                    Study All Names
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full">
                  <Link to="/play">
                    Full Challenge
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Names Grid (shown after completion or during practice) */}
        {names.length > 0 && (isCompleted || found.size > 0) && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-6 text-center">Today's Names</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {names.map((name) => (
                <Link key={name.id} to={`/study/${name.id}`}>
                  <NameCard
                    name={name}
                    isFound={found.has(name.id)}
                    showProgress={true}
                    className="h-full"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Daily;
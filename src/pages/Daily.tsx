import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyTimer } from '@/components/DailyTimer';
import { StreakDisplay } from '@/components/StreakDisplay';
import { NameCard } from '@/components/NameCard';
import { StatusMessage } from '@/components/StatusMessage';
import { BismillahReminder } from '@/components/BismillahReminder';
import { SpacedRepetitionSession } from '@/components/SpacedRepetitionSession';
import { useDailyStore } from '@/store/daily';
import { useSpacedRepetitionStore } from '@/store/spacedRepetition';
import { useSettings } from '@/hooks/useSettings';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { ArrowLeft, Play, RotateCcw, Trophy, Calendar, Brain, Target, Clock } from 'lucide-react';

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
    allNames,
    isLoading,
    loadNames,
    startDaily,
    submitGuess,
    tick,
    setInput,
    resetDaily
  } = useDailyStore();

  const {
    initializeItems,
    startReviewSession,
    resetSession,
    getStats,
    loading: srLoading,
    sessionStarted: srSessionStarted,
    sessionCompleted: srSessionCompleted
  } = useSpacedRepetitionStore();

  const { settings } = useSettings();
  const { playSound } = useAudio();
  const { success: vibrateSuccess, error: vibrateError } = useHaptics();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning' | null; text: string }>({ type: null, text: '' });
  const [wrongInput, setWrongInput] = useState(false);
  const [showBismillahReminder, setShowBismillahReminder] = useState(false);
  const [readyToStart, setReadyToStart] = useState(false);
  const [activeTab, setActiveTab] = useState<'regular' | 'spaced'>('regular');
  const [srStats, setSrStats] = useState({ due: 0, total: 0, reviewed: 0 });

  // Timer effect
  useEffect(() => {
    if (!isActive || isCompleted || activeTab !== 'regular') return;

    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isCompleted, tick, activeTab]);

  // Load names and initialize spaced repetition on component mount
  useEffect(() => {
    loadNames();
    initializeItems();
  }, [loadNames, initializeItems]);

  // Update spaced repetition stats
  useEffect(() => {
    if (!srLoading) {
      setSrStats(getStats());
    }
  }, [srLoading, getStats, srSessionStarted, srSessionCompleted]);

  // Initialize daily challenge
  useEffect(() => {
    if (allNames.length > 0 && !todayCompleted && activeTab === 'regular') {
      if (settings.bismillahReminder && !readyToStart) {
        setShowBismillahReminder(true);
      } else {
        startDaily();
      }
    }
  }, [startDaily, allNames.length, todayCompleted, settings.bismillahReminder, readyToStart, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isActive || isCompleted) return;

    const success = submitGuess(input);
    
    if (success) {
      if (settings.soundEffects) playSound('correct');
      if (settings.haptics) vibrateSuccess();
      setStatusMessage({ type: 'success', text: '✅ Found: Correct!' });
      setWrongInput(false);
    } else {
      if (settings.soundEffects) playSound('incorrect');
      if (settings.haptics) vibrateError();
      setStatusMessage({ type: 'error', text: '❌ Not found - try another name' });
      setWrongInput(true);
    }
  };

  // Clear feedback after delay
  useEffect(() => {
    if (wrongInput) {
      const timer = setTimeout(() => setWrongInput(false), 600);
      return () => clearTimeout(timer);
    }
  }, [wrongInput]);

  const handleBismillahStart = () => {
    setShowBismillahReminder(false);
    setReadyToStart(true);
    if (activeTab === 'regular') {
      startDaily();
    } else {
      startReviewSession();
    }
  };

  const handleBismillahCancel = () => {
    setShowBismillahReminder(false);
    setReadyToStart(true);
    if (activeTab === 'regular') {
      startDaily();
    } else {
      startReviewSession();
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'regular' | 'spaced');
    
    if (value === 'spaced' && settings.bismillahReminder && !readyToStart) {
      setShowBismillahReminder(true);
    } else if (value === 'spaced') {
      startReviewSession();
    }
  };

  const handleSpacedRepetitionComplete = () => {
    setActiveTab('regular');
    resetSession();
  };

  const progress = names.length > 0 ? (found.size / names.length) * 100 : 0;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (todayCompleted && !isActive && activeTab === 'regular') {
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

        {/* Tab Selection */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="regular" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Regular Practice
              {todayCompleted && <Badge variant="secondary" className="ml-2">Done</Badge>}
            </TabsTrigger>
            <TabsTrigger value="spaced" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Spaced Repetition
              {srStats.due > 0 && <Badge variant="default" className="ml-2">{srStats.due}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="mt-6">
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
                              wrongInput ? 'shake' : ''
                            }`}
                            autoFocus
                            disabled={!isActive}
                          />
                          <StatusMessage 
                            type={statusMessage.type}
                            message={statusMessage.text}
                            onClear={() => setStatusMessage({ type: null, text: '' })}
                          />
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

            {/* Hint System - Progressive clues */}
            {names.length > 0 && isActive && !isCompleted && (
              <div className="mt-12">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-4">Daily Challenge Hints</h3>
                  <p className="text-muted-foreground mb-6">
                    Use your memory and these hints to find all {names.length} names
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {names.map((name, index) => {
                      const isFound = found.has(name.id);
                      const progress = Math.floor((5 * 60 - timeLeft) / 30); // Hint level based on time elapsed
                      
                      return (
                        <div 
                          key={name.id}
                          className={`p-4 rounded-lg border transition-all duration-300 ${
                            isFound 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-card border-border'
                          }`}
                        >
                          <div className="text-center space-y-2">
                            <div className="text-sm font-medium">#{name.id}</div>
                            
                            {/* Progressive Hints */}
                            {progress >= 0 && (
                              <div className="text-sm text-muted-foreground">
                                {name.meanings.split(',')[0]}
                              </div>
                            )}
                            
                            {progress >= 2 && (
                              <div className="text-xs text-muted-foreground">
                                {name.englishName.length} letters
                              </div>
                            )}
                            
                            {progress >= 4 && (
                              <div className="text-xs font-mono">
                                {name.englishName.charAt(0)}___
                              </div>
                            )}
                            
                            {progress >= 6 && (
                              <div className="text-xs font-mono">
                                {name.englishName.slice(0, Math.floor(name.englishName.length / 2))}___
                              </div>
                            )}
                            
                            {isFound && (
                              <div className="font-semibold text-primary">
                                {name.englishName}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Names Grid - Only shown after completion */}
            {names.length > 0 && (isCompleted || todayCompleted) && (
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
          </TabsContent>

          <TabsContent value="spaced" className="mt-6">
            <div className="space-y-6">
              {/* Spaced Repetition Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Spaced Repetition Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{srStats.due}</div>
                    <div className="text-sm text-muted-foreground">Due Today</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">{srStats.reviewed}</div>
                    <div className="text-sm text-muted-foreground">Reviewed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">{srStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                </CardContent>
              </Card>

              {/* Spaced Repetition Session */}
              <SpacedRepetitionSession onComplete={handleSpacedRepetitionComplete} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <BismillahReminder
        isOpen={showBismillahReminder}
        onStart={handleBismillahStart}
        onCancel={handleBismillahCancel}
        mode={activeTab === 'spaced' ? 'study' : 'daily'}
      />
    </div>
  );
};

export default Daily;
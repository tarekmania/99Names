import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { StatusMessage } from '@/components/StatusMessage';
import { BismillahReminder } from '@/components/BismillahReminder';
import { SpacedRepetitionProgress } from '@/components/SpacedRepetitionProgress';
import { usePracticeStore, type PracticeStats } from '@/store/practice';
import { useSpacedRepetitionStore } from '@/store/spacedRepetition';
import { useSettings } from '@/hooks/useSettings';
import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { 
  ArrowLeft, 
  Play, 
  RotateCcw, 
  Trophy, 
  Brain, 
  Target, 
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  TrendingUp,
  Flame,
  BookOpen,
  Star
} from 'lucide-react';

const Practice = () => {
  const {
    allNames,
    currentSession,
    currentIndex,
    sessionActive,
    sessionCompleted,
    showAnswer,
    selectedQuality,
    answerRevealed,
    isLoading,
    input,
    wrongInput,
    sessionResults,
    loading,
    initializePractice,
    generateSmartSession,
    startSession,
    submitAnswer,
    revealAnswer,
    submitQuality,
    resetSession,
    setInput,
    clearFeedback,
    getStats,
    getCurrentItem,
  } = usePracticeStore();

  // Initialize spaced repetition store
  const spacedRepetitionStore = useSpacedRepetitionStore();

  const { settings } = useSettings();
  const { playSound } = useAudio();
  const { success: vibrateSuccess, error: vibrateError } = useHaptics();
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning' | null; text: string }>({ type: null, text: '' });
  const [showBismillahReminder, setShowBismillahReminder] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(15); // minutes

  const currentItem = getCurrentItem();
  const [stats, setStats] = useState<PracticeStats>({
    totalNames: 0,
    masteredNames: 0,
    learningNames: 0,
    newNames: 0,
    dueForReview: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalSessions: 0,
    averageAccuracy: 0,
    totalPracticeTime: 0,
  });
  const progress = currentSession.length > 0 ? ((currentIndex + 1) / currentSession.length) * 100 : 0;

  // Initialize practice on component mount
  useEffect(() => {
    initializePractice();
    spacedRepetitionStore.initializeItems();
  }, [initializePractice, spacedRepetitionStore]);

  // Load stats when component mounts and when session changes
  useEffect(() => {
    const loadStats = async () => {
      try {
        const newStats = await getStats();
        setStats(newStats);
      } catch (error) {
        console.warn('Failed to load practice stats:', error);
      }
    };
    
    if (!loading) {
      loadStats();
    }
  }, [loading, getStats, sessionCompleted]);

  // Clear feedback after delay
  useEffect(() => {
    if (wrongInput) {
      const timer = setTimeout(() => clearFeedback(), 600);
      return () => clearTimeout(timer);
    }
  }, [wrongInput, clearFeedback]);

  const handleStartPractice = async () => {
    if (settings.bismillahReminder) {
      setShowBismillahReminder(true);
    } else {
      await startPracticeSession();
    }
  };

  const startPracticeSession = async () => {
    await generateSmartSession(sessionDuration * 60); // Convert to seconds
    startSession();
  };

  const handleBismillahStart = async () => {
    setShowBismillahReminder(false);
    await startPracticeSession();
  };

  const handleBismillahCancel = async () => {
    setShowBismillahReminder(false);
    await startPracticeSession();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionActive || !currentItem) return;

    const success = submitAnswer(input);
    
    if (success) {
      if (settings.soundEffects) playSound('correct');
      if (settings.haptics) vibrateSuccess();
      setStatusMessage({ type: 'success', text: '✅ Correct!' });
    } else {
      if (settings.soundEffects) playSound('incorrect');
      if (settings.haptics) vibrateError();
      setStatusMessage({ type: 'error', text: '❌ Try again or reveal the answer' });
    }
  };

  const handleRevealAnswer = () => {
    revealAnswer();
    setStatusMessage({ type: 'warning', text: '💡 Answer revealed' });
  };

  const handleQualitySubmit = (quality: number) => {
    submitQuality(quality);
    
    if (settings.soundEffects) {
      playSound(quality >= 3 ? 'correct' : 'incorrect');
    }
    if (settings.haptics) {
      quality >= 3 ? vibrateSuccess() : vibrateError();
    }
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

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'review': return '🔄 Review';
      case 'new': return '✨ New';
      case 'reinforcement': return '💪 Reinforcement';
      case 'challenge': return '🎯 Challenge';
      default: return '📚 Practice';
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'review': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'new': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'reinforcement': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'challenge': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Session completed view
  if (sessionCompleted && sessionResults) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <Card className="bg-gradient-accent shadow-glow">
              <CardContent className="text-center py-8">
                <Trophy className="w-16 h-16 text-accent-foreground mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-accent-foreground mb-2">
                  Practice Session Complete!
                </h1>
                <p className="text-accent-foreground/80 mb-6">
                  Great work on your learning journey!
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-accent-foreground">{sessionResults.itemsReviewed}</div>
                    <div className="text-sm text-accent-foreground/80">Reviewed</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-accent-foreground">{sessionResults.itemsLearned}</div>
                    <div className="text-sm text-accent-foreground/80">Learned</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-accent-foreground">{Math.round(sessionResults.sessionDuration / 60000)}</div>
                    <div className="text-sm text-accent-foreground/80">Minutes</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-accent-foreground">{sessionResults.totalItems}</div>
                    <div className="text-sm text-accent-foreground/80">Total Items</div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-3 flex-wrap">
                  <Button 
                    onClick={resetSession} 
                    size="lg" 
                    className="bg-white/20 hover:bg-white/30"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Back to Practice
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Main Menu
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/study">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Browse Names
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Active session view
  if (sessionActive && currentItem) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Session Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" onClick={resetSession}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Session
            </Button>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Item {currentIndex + 1} of {currentSession.length}
              </div>
              <Progress value={progress} className="w-32 h-2 mt-1" />
            </div>
            
            <Badge variant="outline" className={getItemTypeColor(currentItem.type)}>
              {getItemTypeLabel(currentItem.type)}
            </Badge>
          </div>

          {/* Main Session Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {isLoading ? (
                /* Loading State */
                <div className="text-center space-y-4 py-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
                    <div className="h-8 bg-muted rounded w-32 mx-auto"></div>
                    <div className="h-6 bg-muted rounded w-40 mx-auto"></div>
                  </div>
                  <div className="text-sm text-muted-foreground">Loading next item...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Question */}
                  <div className="text-center space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {currentItem.type === 'new' ? 'Learn this new name:' : 'What is the meaning of this name?'}
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {currentItem.name.arabic}
                    </div>
                    <div className="text-xl font-semibold">
                      {currentItem.name.englishName}
                    </div>
                  </div>

                  {/* Input Form - Only for non-new items or after revealing new items */}
                  {(currentItem.type !== 'new' || showAnswer) && !answerRevealed && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Type the meaning..."
                          className={`text-lg h-12 ${wrongInput ? 'shake' : ''}`}
                          autoFocus
                        />
                        <StatusMessage 
                          type={statusMessage.type}
                          message={statusMessage.text}
                          onClear={() => setStatusMessage({ type: null, text: '' })}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button type="submit" className="flex-1" disabled={!input.trim()}>
                          Submit Answer
                        </Button>
                        <Button type="button" variant="outline" onClick={handleRevealAnswer}>
                          Reveal Answer
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Reveal Answer Button - For new items */}
                  {currentItem.type === 'new' && !showAnswer && (
                    <div className="text-center">
                      <Button onClick={handleRevealAnswer} size="lg">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Learn This Name
                      </Button>
                    </div>
                  )}

                  {/* Answer Display */}
                  {showAnswer && (
                    <div className="bg-muted/50 rounded-lg p-6 space-y-4 animate-in fade-in-50 duration-300">
                      <div className="text-center">
                        <h3 className="font-semibold mb-2 text-primary">Meaning:</h3>
                        <p className="text-lg">{currentItem.name.meanings}</p>
                      </div>
                    </div>
                  )}

                  {/* Quality Rating */}
                  {showAnswer && (
                    <div className="space-y-4 animate-in fade-in-50 duration-300">
                      <div className="text-center">
                        <h3 className="font-semibold mb-2">How well did you know this?</h3>
                        <p className="text-sm text-muted-foreground">
                          Rate your knowledge to optimize future reviews
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {[0, 1, 2, 3, 4, 5].map((quality) => (
                          <Button
                            key={quality}
                            variant={selectedQuality === quality ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleQualitySubmit(quality)}
                            className={`flex flex-col h-auto py-3 ${
                              selectedQuality === quality ? 'ring-2 ring-primary' : ''
                            }`}
                            disabled={selectedQuality !== null}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {quality >= 3 ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Practice Hub (main view)
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
            <Brain className="w-6 h-6 text-primary" />
            Smart Practice
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing practice system...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-primary text-primary-foreground">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="w-6 h-6" />
                  Your Learning Journey
                </CardTitle>
                <p className="text-primary-foreground/90">
                  {stats.masteredNames > 0 
                    ? `Amazing progress! You've mastered ${stats.masteredNames} of Allah's Beautiful Names.`
                    : "Begin your journey of learning Allah's Beautiful Names."
                  }
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Overall Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Overall Progress</span>
                    <span className="text-2xl font-bold text-primary">
                      {Math.round(((stats.masteredNames + stats.learningNames) / stats.totalNames) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 mb-1">
                    <div 
                      className="bg-gradient-primary h-3 rounded-full transition-all duration-500 animate-fade-in"
                      style={{ 
                        width: `${Math.round(((stats.masteredNames + stats.learningNames) / stats.totalNames) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats.masteredNames + stats.learningNames} of {stats.totalNames} names learned
                  </p>
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100 hover-scale">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{stats.masteredNames}</div>
                    <div className="text-sm font-medium text-green-700">Mastered</div>
                    <div className="text-xs text-green-600 mt-1">
                      {stats.masteredNames > 0 ? "🎉 Excellence!" : "Start your journey"}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100 hover-scale">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{stats.learningNames}</div>
                    <div className="text-sm font-medium text-blue-700">Learning</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {stats.learningNames > 0 ? "📚 In progress" : "Ready to learn"}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100 hover-scale">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{stats.dueForReview}</div>
                    <div className="text-sm font-medium text-orange-700">Due Today</div>
                    <div className="text-xs text-orange-600 mt-1">
                      {stats.dueForReview > 0 ? "⏰ Ready to review" : "All caught up!"}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100 hover-scale">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{stats.newNames}</div>
                    <div className="text-sm font-medium text-purple-700">New Names</div>
                    <div className="text-xs text-purple-600 mt-1">
                      {stats.newNames > 0 ? "🌟 Awaiting discovery" : "All explored!"}
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                {(stats.masteredNames > 0 || stats.learningNames > 0) && (
                  <div className="bg-gradient-subtle rounded-xl p-4 animate-fade-in">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Recent Achievements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {stats.masteredNames >= 1 && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          🎯 First Name Mastered
                        </Badge>
                      )}
                      {stats.masteredNames >= 5 && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          📚 Scholar in Progress
                        </Badge>
                      )}
                      {stats.masteredNames >= 10 && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          🏆 Dedicated Learner
                        </Badge>
                      )}
                      {stats.learningNames >= 20 && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          🌟 Knowledge Seeker
                        </Badge>
                      )}
                      {stats.masteredNames + stats.learningNames >= stats.totalNames / 2 && (
                        <Badge className="bg-gradient-primary text-primary-foreground">
                          🚀 Halfway Champion
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Motivational Message */}
                <div className="text-center mt-6 p-4 bg-gradient-accent rounded-xl">
                  <p className="text-accent-foreground font-medium">
                    {stats.masteredNames === 0 
                      ? "🌱 Every master was once a beginner. Start your first session today!"
                      : stats.masteredNames < 10
                      ? `🔥 You're building momentum! ${stats.masteredNames} down, ${stats.totalNames - stats.masteredNames} to go!`
                      : stats.masteredNames < 50
                      ? `✨ Incredible dedication! You're ${Math.round((stats.masteredNames / stats.totalNames) * 100)}% of the way there!`
                      : stats.masteredNames < 90
                      ? `🏆 You're in the final stretch! Only ${stats.totalNames - stats.masteredNames} names left to master!`
                      : `🎉 Amazing! You've nearly mastered all of Allah's Beautiful Names!`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Today's Focus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Today's Focus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <RotateCcw className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{stats.dueForReview} Reviews</div>
                      <div className="text-sm text-muted-foreground">Due today</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{Math.min(3, stats.newNames)} New Names</div>
                      <div className="text-sm text-muted-foreground">Ready to learn</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{stats.currentStreak} Days</div>
                      <div className="text-sm text-muted-foreground">Current streak</div>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Estimated session time: {sessionDuration} minutes</span>
                  </div>
                  
                  <Button size="lg" onClick={handleStartPractice} className="w-full md:w-auto">
                    <Play className="w-5 h-5 mr-2" />
                    Start Smart Practice Session
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Spaced Repetition Progress */}
            <SpacedRepetitionProgress />

            {/* Session Customization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Customize Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Duration</label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20, 30].map((duration) => (
                      <Button
                        key={duration}
                        variant={sessionDuration === duration ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSessionDuration(duration)}
                      >
                        {duration}m
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/study">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Browse All Names
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/stats">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Detailed Stats
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <BismillahReminder
        isOpen={showBismillahReminder}
        onStart={handleBismillahStart}
        onCancel={handleBismillahCancel}
        mode="study"
      />
    </div>
  );
};

export default Practice;

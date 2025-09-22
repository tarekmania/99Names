import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, CheckCircle, XCircle, Eye, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSpacedRepetitionStore } from '@/store/spacedRepetition';
import { useSettings } from '@/hooks/useSettings';
import { BismillahReminder } from '@/components/BismillahReminder';
import { normalizeCore } from '@/utils/match';

const SpacedRepetition = () => {
  const {
    items,
    currentName,
    dueNames,
    isLoading,
    input,
    feedback,
    isAnswerShown,
    sessionStats,
    loadItems,
    getNextName,
    submitAnswer,
    showAnswer: showAnswerAction,
    setInput,
    clearFeedback,
    resetSession,
    getDueCount,
  } = useSpacedRepetitionStore();

  const { settings } = useSettings();
  const [showBismillah, setShowBismillah] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted && settings?.bismillahReminder) {
      setShowBismillah(true);
    } else {
      loadItems();
      setHasStarted(true);
    }
  }, [hasStarted, settings?.bismillahReminder, loadItems]);

  const handleBismillahContinue = () => {
    setShowBismillah(false);
    setHasStarted(true);
    loadItems();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    clearFeedback();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName || !input.trim()) return;

    // Check if the answer is correct using the same matching logic as the main game
    const normalizedInput = normalizeCore(input);
    let isCorrect = false;

    // Check English name
    if (currentName.englishName && normalizeCore(currentName.englishName).includes(normalizedInput)) {
      isCorrect = true;
    }

    // Check aliases
    if (!isCorrect && currentName.aliases) {
      isCorrect = currentName.aliases.some((alias: string) =>
        normalizeCore(alias).includes(normalizedInput)
      );
    }

    // Submit with quality score (4 = correct, 2 = incorrect)
    submitAnswer(isCorrect ? 4 : 2);
    setInput('');
  };

  const handleQualitySubmit = (quality: number) => {
    submitAnswer(quality);
  };

  if (showBismillah) {
    return (
      <BismillahReminder
        isOpen={showBismillah}
        onStart={handleBismillahContinue}
        onCancel={() => {
          setShowBismillah(false);
          setHasStarted(true);
          loadItems();
        }}
        mode="study"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading your spaced repetition session...</p>
        </div>
      </div>
    );
  }

  const dueCount = getDueCount();

  if (dueCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" asChild>
              <Link to="/" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Spaced Repetition</h1>
            <div />
          </div>

          {/* All Done Message */}
          <Card className="text-center shadow-soft">
            <CardHeader>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <CardTitle className="text-2xl">All Caught Up!</CardTitle>
              <CardDescription>
                You've reviewed all names that are due today. Come back tomorrow for more reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Session Statistics:
              </div>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{sessionStats.reviewed}</div>
                  <div className="text-sm text-muted-foreground">Reviewed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{sessionStats.correct}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{sessionStats.incorrect}</div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/study">Study Mode</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Back to Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Spaced Repetition</h1>
          <Button variant="outline" onClick={resetSession} size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats Header */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="shadow-soft">
            <CardContent className="text-center pt-4 pb-4">
              <div className="text-lg font-bold text-primary">{dueCount}</div>
              <div className="text-xs text-muted-foreground">Due Today</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="text-center pt-4 pb-4">
              <div className="text-lg font-bold text-success">{sessionStats.correct}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="text-center pt-4 pb-4">
              <div className="text-lg font-bold text-destructive">{sessionStats.incorrect}</div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="text-center pt-4 pb-4">
              <div className="text-lg font-bold">{sessionStats.reviewed}</div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </CardContent>
          </Card>
        </div>

        {/* Current Name Card */}
        {currentName && (
          <Card className="shadow-medium mb-8">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="outline">#{currentName.id}</Badge>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              
              {settings?.showArabic && currentName.arabic && (
                <div className="text-4xl font-arabic mb-4 text-primary">
                  {currentName.arabic}
                </div>
              )}
              
              <CardTitle className="text-2xl">
                What is the English name or meaning?
              </CardTitle>
              
              {isAnswerShown && (
                <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                  <div className="font-semibold text-lg">{currentName.englishName}</div>
                  {settings?.showMeaning && currentName.meanings && (
                    <div className="text-muted-foreground mt-2">{currentName.meanings}</div>
                  )}
                  {currentName.aliases && currentName.aliases.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Also accepted: {currentName.aliases.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!isAnswerShown ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Type the English name or meaning..."
                    value={input}
                    onChange={handleInputChange}
                    className="text-lg"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!input.trim()}>
                      Submit Answer
                    </Button>
                    <Button type="button" variant="outline" onClick={showAnswerAction}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    How well did you know this name?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleQualitySubmit(1)}
                      className="gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Don't Know
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleQualitySubmit(3)}
                    >
                      Somewhat
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleQualitySubmit(4)}
                    >
                      Good
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={() => handleQualitySubmit(5)}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Easy
                    </Button>
                  </div>
                </div>
              )}
              
              {feedback && (
                <div className="mt-4 text-center font-medium">
                  {feedback}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="shadow-soft">
          <CardContent className="text-center pt-6 pb-6">
            <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Spaced repetition helps you learn more efficiently by reviewing names 
              at optimal intervals based on how well you remember them.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpacedRepetition;
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameGrid } from '@/components/GameGrid';
import { Home, Play, Share2, Trophy, Clock, Target, Award } from 'lucide-react';

export default function EndSummary() {
  const navigate = useNavigate();
  const { foundIds, submissions, isOver, restart } = useGameStore();

  // Redirect to home if no game was played
  useEffect(() => {
    if (!isOver) {
      navigate('/');
    }
  }, [isOver, navigate]);

  if (!isOver) return null;

  const accuracy = submissions > 0 ? Math.round((foundIds.size / submissions) * 100) : 0;
  const completion = Math.round((foundIds.size / 99) * 100);

  const handleShare = async () => {
    const shareData = {
      title: '99 Names Memory Game',
      text: `I found ${foundIds.size}/99 Names of Allah with ${accuracy}% accuracy! Can you beat my score?`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(
          `${shareData.text}\n\nPlay at: ${shareData.url}`
        );
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(
        `${shareData.text}\n\nPlay at: ${shareData.url}`
      );
    }
  };

  const handlePlayAgain = () => {
    restart();
    navigate('/play');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-full mb-4 shadow-glow">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Game Complete!</h1>
          <p className="text-lg text-muted-foreground">
            {completion === 100 ? 'Perfect! You found all 99 Names!' : `You found ${foundIds.size} out of 99 Names of Allah`}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center shadow-medium">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                <Target className="w-4 h-4" />
                Names Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{foundIds.size}</div>
              <div className="text-sm text-muted-foreground">out of 99</div>
            </CardContent>
          </Card>

          <Card className="text-center shadow-medium">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                <Award className="w-4 h-4" />
                Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">{foundIds.size}/{submissions} correct</div>
            </CardContent>
          </Card>

          <Card className="text-center shadow-medium">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{completion}%</div>
              <div className="text-sm text-muted-foreground">of all names</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <Button
            onClick={handlePlayAgain}
            size="lg"
            className="gap-2 bg-gradient-primary hover:opacity-90"
          >
            <Play className="w-5 h-5" />
            Play Again
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share Result
          </Button>

          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="lg"
            className="gap-2"
          >
            <Home className="w-5 h-5" />
            Home
          </Button>
        </div>

        {/* Final Grid View */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-center mb-6">Final Results</h2>
          <GameGrid showArabic={true} showMeaning={true} />
        </div>

        {/* Encouragement */}
        <div className="text-center max-w-2xl mx-auto">
          <Card className="bg-gradient-accent shadow-soft">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed">
                {completion === 100 
                  ? "Exceptional! You have memorized all 99 Beautiful Names of Allah. May this knowledge bring you closer to the Divine." 
                  : completion >= 70 
                    ? "Well done! You have a good knowledge of Allah's Beautiful Names. Keep practicing to master them all."
                    : completion >= 40
                      ? "Good effort! The 99 Names are a beautiful way to remember Allah's attributes. Keep learning!"
                      : "Every step in learning Allah's Beautiful Names is blessed. Keep trying and you'll improve!"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, Target, Clock, Zap, TrendingUp, Calendar } from 'lucide-react';
import { GameResult } from '@/store/game';

interface Stats {
  totalGames: number;
  bestScore: number;
  averageScore: number;
  bestTime: number;
  totalTimePlayed: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  recentGames: GameResult[];
}

export default function Stats() {
  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    bestScore: 0,
    averageScore: 0,
    bestTime: 0,
    totalTimePlayed: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentGames: [],
  });

  useEffect(() => {
    // Load stats from localStorage
    const results: GameResult[] = JSON.parse(localStorage.getItem('gameResults') || '[]');
    
    if (results.length === 0) {
      return;
    }

    const totalGames = results.length;
    const bestScore = Math.max(...results.map(r => r.found));
    const averageScore = results.reduce((sum, r) => sum + r.found, 0) / totalGames;
    const completedGames = results.filter(r => r.completed);
    const bestTime = completedGames.length > 0 ? Math.min(...completedGames.map(r => r.durationMs)) : 0;
    const totalTimePlayed = results.reduce((sum, r) => sum + r.durationMs, 0);
    
    // Calculate accuracy (assuming submissions = found + (found * 0.3) as rough estimate)
    const averageAccuracy = results.reduce((sum, r) => {
      const estimatedSubmissions = Math.max(r.found, Math.round(r.found * 1.3));
      return sum + (estimatedSubmissions > 0 ? (r.found / estimatedSubmissions) * 100 : 0);
    }, 0) / totalGames;

    // Calculate streaks (consecutive days with games played)
    const dateGroups = results.reduce((groups, result) => {
      const date = new Date(result.timestamp).toDateString();
      groups[date] = true;
      return groups;
    }, {} as Record<string, boolean>);

    const uniqueDates = Object.keys(dateGroups).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Calculate current streak (from today backwards)
    const today = new Date().toDateString();
    let checkDate = new Date();
    
    while (checkDate >= new Date(uniqueDates[0])) {
      const dateStr = checkDate.toDateString();
      if (dateGroups[dateStr]) {
        currentStreak++;
      } else if (currentStreak > 0 || dateStr === today) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const daysDiff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    setStats({
      totalGames,
      bestScore,
      averageScore: Math.round(averageScore * 10) / 10,
      bestTime,
      totalTimePlayed,
      averageAccuracy: Math.round(averageAccuracy),
      currentStreak,
      longestStreak: Math.max(longestStreak, 1),
      recentGames: results.slice(-10).reverse(),
    });
  }, []);

  const formatTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
          
          <Button asChild className="gap-2 bg-gradient-primary">
            <Link to="/play">
              <Target className="w-4 h-4" />
              Play Game
            </Link>
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Your Statistics</h1>
          <p className="text-muted-foreground">Track your progress and achievements</p>
        </div>

        {stats.totalGames === 0 ? (
          /* No games played yet */
          <Card className="shadow-medium text-center">
            <CardContent className="pt-12 pb-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Games Played Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start playing to see your statistics and track your progress!
              </p>
              <Button asChild className="gap-2 bg-gradient-primary">
                <Link to="/play">
                  <Target className="w-4 h-4" />
                  Play Your First Game
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-medium text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Best Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{stats.bestScore}</div>
                  <div className="text-sm text-muted-foreground">out of 99 names</div>
                </CardContent>
              </Card>

              <Card className="shadow-medium text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <Target className="w-4 h-4" />
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">{stats.averageScore}</div>
                  <div className="text-sm text-muted-foreground">names per game</div>
                </CardContent>
              </Card>

              <Card className="shadow-medium text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    Best Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">{formatTime(stats.bestTime)}</div>
                  <div className="text-sm text-muted-foreground">to complete all 99</div>
                </CardContent>
              </Card>

              <Card className="shadow-medium text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">{stats.averageAccuracy}%</div>
                  <div className="text-sm text-muted-foreground">average accuracy</div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Games Played
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalGames}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total time: {formatDuration(stats.totalTimePlayed)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-success" />
                    Current Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.currentStreak}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {stats.currentStreak === 1 ? 'day' : 'days'} in a row
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    Best Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.longestStreak}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    longest streak achieved
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Games */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Recent Games</CardTitle>
                <CardDescription>Your last 10 game sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentGames.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No recent games</p>
                ) : (
                  <div className="space-y-2">
                    {stats.recentGames.map((game, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            game.completed ? 'bg-success' : game.found >= 70 ? 'bg-accent' : 'bg-muted-foreground'
                          }`} />
                          <div>
                            <div className="font-medium">{game.found}/99 names</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(game.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatTime(game.durationMs)}</div>
                          <div className="text-xs text-muted-foreground">
                            {game.completed ? 'Completed' : 'Partial'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
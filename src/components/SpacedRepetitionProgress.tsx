import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSpacedRepetitionStore } from '@/store/spacedRepetition';
import { Calendar, Target, Brain, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export const SpacedRepetitionProgress = () => {
  const { getStats, todayReviewed, sessionStats } = useSpacedRepetitionStore();
  const stats = getStats();
  
  const totalLearning = stats.newItems + stats.learningItems + stats.youngItems + stats.matureItems;
  const progressPercentage = totalLearning > 0 ? Math.round(((stats.learningItems + stats.youngItems + stats.matureItems) / totalLearning) * 100) : 0;
  const masteryPercentage = totalLearning > 0 ? Math.round((stats.matureItems / totalLearning) * 100) : 0;
  
  const stageData = [
    { 
      stage: 'New', 
      count: stats.newItems, 
      color: 'bg-blue-500', 
      icon: Target,
      description: 'Not yet learned'
    },
    { 
      stage: 'Learning', 
      count: stats.learningItems, 
      color: 'bg-yellow-500', 
      icon: Brain,
      description: 'In progress'
    },
    { 
      stage: 'Young', 
      count: stats.youngItems, 
      color: 'bg-green-500', 
      icon: TrendingUp,
      description: '< 3 weeks interval'
    },
    { 
      stage: 'Mature', 
      count: stats.matureItems, 
      color: 'bg-purple-500', 
      icon: CheckCircle,
      description: '3+ weeks interval'
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Review Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Today's Reviews</span>
              <span className="font-medium">{todayReviewed} completed</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Due for Review</span>
              <Badge variant={stats.due > 0 ? "destructive" : "secondary"}>
                {stats.due} items
              </Badge>
            </div>
          </div>

          {/* Session Stats */}
          {sessionStats.total > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Session Accuracy</span>
                <span className="font-medium">
                  {Math.round((sessionStats.correct / sessionStats.total) * 100)}%
                </span>
              </div>
              <Progress 
                value={(sessionStats.correct / sessionStats.total) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Overall Learning Progress */}
          <div className="border-t pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{progressPercentage}% learned</span>
            </div>
            <Progress value={progressPercentage} className="h-2 mb-2" />
            
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Mastery Level</span>
              <span className="font-medium">{masteryPercentage}% mastered</span>
            </div>
            <Progress value={masteryPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Learning Stages Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5" />
            Learning Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {stageData.map(({ stage, count, color, icon: Icon, description }) => (
              <div key={stage} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{stage}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {totalLearning > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Names</span>
                <span className="font-medium">{totalLearning}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivational Message */}
      {stats.due > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">
                {stats.due} names are ready for review!
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Regular reviews strengthen your memory and increase retention.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
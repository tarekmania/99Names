import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { GameResult } from '@/store/game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface StatsChartProps {
  results: GameResult[];
}

export function StatsChart({ results }: StatsChartProps) {
  if (results.length === 0) {
    return (
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Progress Chart
          </CardTitle>
          <CardDescription>Your score progression over time</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          No data available. Play more games to see your progress!
        </CardContent>
      </Card>
    );
  }

  // Prepare data for the chart - group by date and get best score for each day
  const dailyData = results.reduce((acc, result) => {
    const date = new Date(result.timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (!acc[date] || result.found > acc[date].score) {
      acc[date] = {
        date,
        score: result.found,
        completed: result.completed,
      };
    }
    
    return acc;
  }, {} as Record<string, { date: string; score: number; completed: boolean }>);

  const chartData = Object.values(dailyData).slice(-10); // Show last 10 days

  const getBarColor = (score: number, completed: boolean) => {
    if (completed) return 'hsl(var(--success))';
    if (score >= 70) return 'hsl(var(--accent))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Progress Chart
        </CardTitle>
        <CardDescription>Your best daily scores over the last 10 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 99]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.score, entry.completed)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success" />
            <span className="text-muted-foreground">Completed (99)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent" />
            <span className="text-muted-foreground">Excellent (70+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-warning" />
            <span className="text-muted-foreground">Good (50+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted-foreground" />
            <span className="text-muted-foreground">Keep trying</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
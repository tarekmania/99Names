import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Type, Eye, Target, Lightbulb } from 'lucide-react';

export default function HowToPlay() {
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
              Start Playing
            </Link>
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 gradient-text">How to Play</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn the rules and master the 99 Names Memory game
          </p>
        </div>

        {/* Game Rules */}
        <div className="grid gap-6 mb-12">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary" />
                Game Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You have exactly <strong>13 minutes</strong> to find as many of the 99 Names of Allah as possible.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-muted rounded"></div>
                  <span>Normal time: White timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded"></div>
                  <span>Last 2 minutes: Yellow timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded"></div>
                  <span>Last 30 seconds: Red timer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Type className="w-6 h-6 text-success" />
                Entering Names
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Type the English transliterations of Allah's names in the input field and press Enter or click Submit.</p>
              
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Example inputs that work:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
                  <div>• rahman, rahmaan, rahmen</div>
                  <div>• rahim, raheem, rahem</div>
                  <div>• ar-rahman, al-rahman</div>
                  <div>• malik, melik, malek</div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>Smart Matching:</strong> The game is very forgiving with spelling variations, 
                different transliterations, and even small typos!
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Target className="w-6 h-6 text-accent" />
                The Grid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>The 99 names are displayed in a 10×10 grid. Each cell shows:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-muted border-2 border-border rounded flex items-center justify-center text-xs">42</div>
                  <span>Hidden: Shows number only</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-success border-2 border-success rounded flex items-center justify-center text-xs text-success-foreground">✓</div>
                  <span>Found: Green with name</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-destructive border-2 border-destructive rounded flex items-center justify-center text-xs text-destructive-foreground">✗</div>
                  <span>Missed: Red after reveal</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-warning" />
                Ending the Game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>The game ends in one of these ways:</p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li><strong>Time runs out:</strong> Automatic reveal when 13 minutes expire</li>
                <li><strong>Manual reveal:</strong> Click the "Reveal All" button anytime</li>
                <li><strong>Perfect game:</strong> Find all 99 names before time expires</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                After the game ends, you'll see your final score and can review which names you found or missed.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="shadow-medium bg-gradient-accent mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Lightbulb className="w-6 h-6" />
              Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Start with the names you know best (Rahman, Rahim, Malik, etc.)</li>
              <li>• Try common variations if one spelling doesn't work (ghafar vs ghafur)</li>
              <li>• Don't worry about prefixes - "ar-" and "al-" are optional</li>
              <li>• The matching is case-insensitive and ignores punctuation</li>
              <li>• Focus on accuracy early, then speed up as you get comfortable</li>
              <li>• Use the progress counter to track how many you've found</li>
            </ul>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Button asChild size="lg" className="gap-2 bg-gradient-primary px-8 py-4">
            <Link to="/play">
              <Target className="w-5 h-5" />
              Ready to Play!
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
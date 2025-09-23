// Update this page (the content is just a fallback if you fail to update the page)

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, BookOpen, Settings, BarChart3, Star, Clock, Target, Calendar, GraduationCap, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, signOut, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header with Auth */}
      <div className="container max-w-4xl mx-auto px-4 pt-6">
        <div className="flex justify-end mb-4">
          {loading ? (
            <div className="h-9 w-24 bg-muted/50 rounded animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>Welcome back!</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/auth">
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-primary rounded-full mb-6 shadow-glow">
            <Star className="w-12 h-12 text-primary-foreground" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
            99 Names Memory
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Test your knowledge of the Beautiful Names of Allah (Asma ul Husna) 
            in this timed memory challenge. Can you recall all 99 names?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 shadow-medium px-6 py-4"
            >
              <Link to="/play" className="gap-2 flex-col h-20">
                <Play className="w-6 h-6" />
                <span>Full Challenge</span>
              </Link>
            </Button>

            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="px-6 py-4"
            >
              <Link to="/daily" className="gap-2 flex-col h-20">
                <Calendar className="w-6 h-6" />
                <span>Daily Practice</span>
              </Link>
            </Button>

            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="px-6 py-4"
            >
              <Link to="/study" className="gap-2 flex-col h-20">
                <GraduationCap className="w-6 h-6" />
                <span>Study Mode</span>
              </Link>
            </Button>
          </div>

          {/* Game Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">13 Minutes</CardTitle>
                <CardDescription>Race against time to find as many names as possible</CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <Target className="w-8 h-8 text-success mx-auto mb-2" />
                <CardTitle className="text-lg">99 Names</CardTitle>
                <CardDescription>Complete collection of Allah's Beautiful Names</CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="text-center">
                <Star className="w-8 h-8 text-accent mx-auto mb-2" />
                <CardTitle className="text-lg">Smart Matching</CardTitle>
                <CardDescription>Forgiving input system accepts multiple spellings</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="container max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-medium hover:shadow-strong transition-all duration-300 cursor-pointer group">
            <Link to="/stats" className="block">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Statistics</CardTitle>
                    <CardDescription>Track your progress and best scores</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-medium hover:shadow-strong transition-all duration-300 cursor-pointer group">
            <Link to="/settings" className="block">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                    <Settings className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Customize your game experience</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-medium hover:shadow-strong transition-all duration-300 cursor-pointer group">
            <Link to="/how-to-play" className="block">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
                    <BookOpen className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <CardTitle>How to Play</CardTitle>
                    <CardDescription>Learn the game rules and tips</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Islamic Quote */}
        <Card className="mt-12 bg-gradient-accent shadow-soft">
          <CardContent className="text-center pt-8 pb-8">
            <p className="text-lg font-medium mb-2">
              "And to Allah belong the best names, so invoke Him by them."
            </p>
            <p className="text-sm text-muted-foreground">
              — Quran 7:180
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;

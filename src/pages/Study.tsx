import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NameCard } from '@/components/NameCard';
import { NAMES } from '@/data/names';
import { ArrowLeft, Search, Grid3x3, List, BookOpen, Play } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

const Study = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { settings } = useSettings();

  const filteredNames = useMemo(() => {
    if (!searchQuery.trim()) return NAMES;
    
    const query = searchQuery.toLowerCase();
    return NAMES.filter(name => 
      name.englishName.toLowerCase().includes(query) ||
      name.arabic.includes(query) ||
      (name.meanings && name.meanings.toLowerCase().includes(query)) ||
      (name.aliases && name.aliases.some(alias => 
        alias.toLowerCase().includes(query)
      ))
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Study Mode</h1>
              </div>
            </div>
            
            <Button asChild>
              <Link to="/play">
                <Play className="w-4 h-4 mr-2" />
                Play Game
              </Link>
            </Button>
          </div>

          <p className="text-muted-foreground mb-6">
            Browse and study all 99 Beautiful Names of Allah. Click on any name to learn more details.
          </p>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search names, meanings, or Arabic text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredNames.length} of {NAMES.length} names
          </p>
          
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          )}
        </div>

        {/* Names Grid/List */}
        {filteredNames.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No names found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or clearing the search.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredNames.map((name) => (
              <Link key={name.id} to={`/study/${name.id}`}>
                <NameCard
                  name={name}
                  className={`h-full transition-all duration-300 hover:scale-[1.02] ${
                    viewMode === 'list' ? 'max-w-none' : ''
                  }`}
                />
              </Link>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {searchQuery === '' && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="shadow-medium hover:shadow-strong transition-all duration-300 cursor-pointer group">
              <Link to="/daily" className="block">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    Try Daily Practice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Practice 15 names in 5 minutes. Perfect for daily spiritual routine.
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-all duration-300 cursor-pointer group">
              <Link to="/play" className="block">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
                      <BookOpen className="w-5 h-5 text-success" />
                    </div>
                    Full Challenge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Test yourself with all 99 names in the complete 13-minute challenge.
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Study;
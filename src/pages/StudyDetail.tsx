import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NAMES } from '@/data/names';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Volume2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useAudio } from '@/hooks/useAudio';

const StudyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { playSound } = useAudio();
  
  const nameId = parseInt(id || '1');
  const currentName = NAMES.find(name => name.id === nameId);
  
  const currentIndex = NAMES.findIndex(name => name.id === nameId);
  const prevName = currentIndex > 0 ? NAMES[currentIndex - 1] : null;
  const nextName = currentIndex < NAMES.length - 1 ? NAMES[currentIndex + 1] : null;

  if (!currentName) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Name not found</h2>
            <p className="text-muted-foreground mb-4">The requested name could not be found.</p>
            <Button asChild>
              <Link to="/study">Back to Study</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePronunciation = () => {
    // Play success sound as placeholder for pronunciation
    playSound('correct');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link to="/study">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Study
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary">#{currentName.id}</Badge>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {NAMES.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Name Card */}
          <div className="lg:col-span-2">
            <Card className="shadow-strong">
              <CardHeader className="text-center pb-6">
                {settings.showArabic && (
                  <div className="mb-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-primary font-arabic text-right">
                      {currentName.arabic}
                    </h1>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    {currentName.englishName}
                  </h2>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePronunciation}
                    className="mx-auto"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Pronunciation
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {settings.showMeaning && currentName.meanings && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Meanings
                    </h3>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-foreground">{currentName.meanings}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {currentName.aliases && currentName.aliases.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Alternative Spellings</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentName.aliases.map((alias, index) => (
                        <Badge key={index} variant="outline">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="text-center text-sm text-muted-foreground">
                  <p>This is one of the 99 Beautiful Names of Allah (Asma ul Husna)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Sidebar */}
          <div className="space-y-6">
            {/* Navigation Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  {prevName ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/study/${prevName.id}`)}
                      className="flex-1 mr-2"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                  ) : (
                    <div className="flex-1 mr-2" />
                  )}
                  
                  {nextName ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/study/${nextName.id}`)}
                      className="flex-1 ml-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <div className="flex-1 ml-2" />
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  {prevName && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Previous: </span>
                      <button
                        onClick={() => navigate(`/study/${prevName.id}`)}
                        className="text-primary hover:underline"
                      >
                        {prevName.englishName}
                      </button>
                    </div>
                  )}
                  
                  {nextName && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next: </span>
                      <button
                        onClick={() => navigate(`/study/${nextName.id}`)}
                        className="text-primary hover:underline"
                      >
                        {nextName.englishName}
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Practice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/daily">
                    Daily Practice
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
      </div>
    </div>
  );
};

export default StudyDetail;
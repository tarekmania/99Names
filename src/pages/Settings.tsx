import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Moon, Sun, Smartphone, Volume2, Eye, Info } from 'lucide-react';

interface Settings {
  darkMode: boolean;
  showArabic: boolean;
  showMeaning: boolean;
  haptics: boolean;
  soundEffects: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    showArabic: true,
    showMeaning: true,
    haptics: true,
    soundEffects: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Check system dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (!savedSettings) {
      setSettings(prev => ({ ...prev, darkMode: prefersDark }));
    }
  }, []);

  // Save settings to localStorage and apply dark mode
  useEffect(() => {
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // Apply dark mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSetting = (key: keyof Settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Settings</h1>
          <p className="text-muted-foreground">Customize your game experience</p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Appearance */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Sun className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the game looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <div>
                    <Label className="text-sm font-medium">Dark Mode</Label>
                    <div className="text-xs text-muted-foreground">
                      Switch between light and dark theme
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => updateSetting('darkMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">ع</span>
                  <div>
                    <Label className="text-sm font-medium">Show Arabic Text</Label>
                    <div className="text-xs text-muted-foreground">
                      Display Arabic names on revealed tiles
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.showArabic}
                  onCheckedChange={(checked) => updateSetting('showArabic', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4" />
                  <div>
                    <Label className="text-sm font-medium">Show Meanings on Hover</Label>
                    <div className="text-xs text-muted-foreground">
                      Display name meanings in tooltips (desktop) or long-press (mobile)
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.showMeaning}
                  onCheckedChange={(checked) => updateSetting('showMeaning', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Smartphone className="w-5 h-5" />
                Feedback
              </CardTitle>
              <CardDescription>
                Control haptic and audio feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4" />
                  <div>
                    <Label className="text-sm font-medium">Haptic Feedback</Label>
                    <div className="text-xs text-muted-foreground">
                      Vibration for correct/incorrect answers (mobile devices)
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.haptics}
                  onCheckedChange={(checked) => updateSetting('haptics', checked)}
                  disabled={!('vibrate' in navigator)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4" />
                  <div>
                    <Label className="text-sm font-medium">Sound Effects</Label>
                    <div className="text-xs text-muted-foreground">
                      Audio feedback for game events (coming soon)
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.soundEffects}
                  onCheckedChange={(checked) => updateSetting('soundEffects', checked)}
                  disabled={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="shadow-medium bg-gradient-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Info className="w-5 h-5" />
                About This Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed mb-4">
                99 Names Memory is a progressive web app designed to help you learn and memorize 
                the Beautiful Names of Allah (Asma ul Husna). The game features intelligent matching 
                that accepts multiple transliterations and spellings.
              </p>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Fully offline capable</div>
                <div>• Installable on mobile devices</div>
                <div>• Respects your privacy (no tracking)</div>
                <div>• Built with accessibility in mind</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <Button asChild size="lg" className="gap-2 bg-gradient-primary">
            <Link to="/play">
              Start Playing
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
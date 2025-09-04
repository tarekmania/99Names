import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/utils';

export function InstallPrompt() {
  const { canInstall, showInstallPrompt } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!canInstall || isDismissed) return null;

  const handleInstall = async () => {
    const success = await showInstallPrompt();
    if (success) {
      setIsDismissed(true);
    }
  };

  return (
    <Card className={cn(
      "fixed bottom-4 left-4 right-4 z-50 shadow-strong border-primary/20",
      "md:left-auto md:right-4 md:w-80",
      "bg-gradient-primary text-primary-foreground"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6" />
            <div>
              <CardTitle className="text-base">Install App</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Get the full experience
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-primary-foreground/90 mb-4">
          Install this app to your home screen for quick access and offline play.
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setIsDismissed(true)}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
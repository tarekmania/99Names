import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Heart } from 'lucide-react';

interface BismillahReminderProps {
  isOpen: boolean;
  onStart: () => void;
  onCancel: () => void;
  mode: 'daily' | 'challenge' | 'study';
}

export function BismillahReminder({ isOpen, onStart, onCancel, mode }: BismillahReminderProps) {
  const modeText = {
    daily: 'Daily Practice',
    challenge: '13-Minute Challenge', 
    study: 'Study Session'
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
            Begin with Bismillah
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4 py-4">
          <div className="text-xl font-arabic text-primary">
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </div>
          
          <div className="text-sm text-muted-foreground">
            "In the name of Allah, the Most Gracious, the Most Merciful"
          </div>
          
          <p className="text-sm">
            Starting your {modeText[mode]} with the right intention and Allah's blessing brings barakah to your learning journey.
          </p>
        </div>

        <DialogFooter className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onCancel}>
            Skip
          </Button>
          <Button onClick={onStart} className="gap-2">
            <Heart className="w-4 h-4" />
            Begin Learning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
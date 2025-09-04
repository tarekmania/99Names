import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface AudioFiles {
  correct: HTMLAudioElement;
  incorrect: HTMLAudioElement;
  complete: HTMLAudioElement;
  tick: HTMLAudioElement;
}

export function useAudio() {
  const { settings } = useSettings();
  const [audio, setAudio] = useState<AudioFiles | null>(null);

  useEffect(() => {
    // Create audio context and sounds
    const audioFiles: AudioFiles = {
      correct: new Audio(),
      incorrect: new Audio(),
      complete: new Audio(),
      tick: new Audio(),
    };

    // Generate sounds using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Success sound (ascending notes)
    const createSuccessSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    // Error sound (descending notes)
    const createErrorSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
      oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.1); // F4
      oscillator.frequency.setValueAtTime(293.66, audioContext.currentTime + 0.2); // D4
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    // Completion sound (triumphant chord)
    const createCompletionSound = () => {
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + 1.5);
      });
    };

    // Tick sound (subtle notification)
    const createTickSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };

    setAudio(audioFiles);

    return () => {
      audioContext.close();
    };
  }, []);

  const playSound = (type: keyof AudioFiles) => {
    if (!settings.soundEffects || !audio) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      switch (type) {
        case 'correct':
          // Success sound (ascending notes)
          const successOscillator = audioContext.createOscillator();
          const successGain = audioContext.createGain();
          
          successOscillator.connect(successGain);
          successGain.connect(audioContext.destination);
          
          successOscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
          successOscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
          successOscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
          
          successGain.gain.setValueAtTime(0.1, audioContext.currentTime);
          successGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          successOscillator.start(audioContext.currentTime);
          successOscillator.stop(audioContext.currentTime + 0.3);
          break;

        case 'incorrect':
          // Error sound (descending notes)
          const errorOscillator = audioContext.createOscillator();
          const errorGain = audioContext.createGain();
          
          errorOscillator.connect(errorGain);
          errorGain.connect(audioContext.destination);
          
          errorOscillator.frequency.setValueAtTime(392.00, audioContext.currentTime);
          errorOscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.1);
          errorOscillator.frequency.setValueAtTime(293.66, audioContext.currentTime + 0.2);
          
          errorGain.gain.setValueAtTime(0.1, audioContext.currentTime);
          errorGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          errorOscillator.start(audioContext.currentTime);
          errorOscillator.stop(audioContext.currentTime + 0.3);
          break;

        case 'complete':
          // Completion sound (triumphant chord)
          const frequencies = [523.25, 659.25, 783.99, 1046.50];
          
          frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
            
            oscillator.start(audioContext.currentTime + index * 0.1);
            oscillator.stop(audioContext.currentTime + 1.5);
          });
          break;

        case 'tick':
          // Subtle tick
          const tickOscillator = audioContext.createOscillator();
          const tickGain = audioContext.createGain();
          
          tickOscillator.connect(tickGain);
          tickGain.connect(audioContext.destination);
          
          tickOscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          tickGain.gain.setValueAtTime(0.05, audioContext.currentTime);
          tickGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          tickOscillator.start(audioContext.currentTime);
          tickOscillator.stop(audioContext.currentTime + 0.1);
          break;
      }
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  };

  return { playSound };
}
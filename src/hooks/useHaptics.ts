import { useSettings } from '@/hooks/useSettings';

export function useHaptics() {
  const { settings } = useSettings();

  const vibrate = (pattern: number | number[]) => {
    if (!settings.haptics || !('vibrate' in navigator)) return;
    
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  };

  const success = () => vibrate([100, 50, 100]); // Two short pulses
  const error = () => vibrate([50, 50, 50, 50, 50]); // Three quick pulses
  const tick = () => vibrate(50); // Single short pulse
  const completion = () => vibrate([200, 100, 200, 100, 300]); // Celebration pattern

  return {
    vibrate,
    success,
    error,
    tick,
    completion,
  };
}
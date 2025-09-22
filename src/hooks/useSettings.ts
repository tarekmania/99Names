import { useState, useEffect } from 'react';

interface Settings {
  darkMode: boolean;
  showArabic: boolean;
  showMeaning: boolean;
  haptics: boolean;
  soundEffects: boolean;
  bismillahReminder: boolean;
}

const defaultSettings: Settings = {
  darkMode: false,
  showArabic: true,
  showMeaning: true,
  haptics: true,
  soundEffects: true,
  bismillahReminder: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      // Check system dark mode preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  return {
    settings,
    updateSetting,
  };
}
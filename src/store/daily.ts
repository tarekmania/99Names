import { create } from 'zustand';
import { NAMES, DivineName } from '@/data/names';
import { db } from '@/utils/db';

export interface DailyResult {
  date: string;
  found: number;
  total: number;
  duration: number;
  completed: boolean;
  names: number[];
}

interface DailyState {
  names: DivineName[];
  found: Set<number>;
  timeLeft: number;
  isActive: boolean;
  isCompleted: boolean;
  input: string;
  currentStreak: number;
  bestStreak: number;
  todayCompleted: boolean;
  
  // Actions
  startDaily: () => void;
  submitGuess: (guess: string) => boolean;
  tick: () => void;
  setInput: (input: string) => void;
  resetDaily: () => void;
  saveDailyResult: (completed: boolean) => void;
}

// Generate daily names using date-based seeding
function getDailyNames(date: Date = new Date()): DivineName[] {
  const dateStr = date.toISOString().split('T')[0];
  const seed = dateStr.split('-').reduce((acc, part) => acc + parseInt(part), 0);
  
  const shuffled = [...NAMES];
  let currentIndex = shuffled.length;
  let randomSeed = seed;
  
  while (currentIndex !== 0) {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    const randomIndex = Math.floor((randomSeed / 233280) * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }
  
  return shuffled.slice(0, 15); // 15 names per day
}

export const useDailyStore = create<DailyState>((set, get) => ({
  names: [],
  found: new Set(),
  timeLeft: 5 * 60, // 5 minutes
  isActive: false,
  isCompleted: false,
  input: '',
  currentStreak: 0,
  bestStreak: 0,
  todayCompleted: false,

  startDaily: async () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyNames = getDailyNames();
    
    // Check if already completed today
    const results = await db.getDailyResults();
    const todayResult = results.find(r => r.date === today);
    
    if (todayResult?.completed) {
      set({ 
        todayCompleted: true,
        names: dailyNames,
        found: new Set(todayResult.names)
      });
      return;
    }
    
    set({ 
      names: dailyNames,
      found: new Set(),
      timeLeft: 5 * 60,
      isActive: true,
      isCompleted: false,
      input: '',
      todayCompleted: false
    });
  },

  submitGuess: (guess: string) => {
    const { names, found, isActive, isCompleted } = get();
    if (!isActive || isCompleted) return false;

    // Import matchesName function and check synchronously
    const { matchesName } = require('@/utils/match');

    for (const name of names) {
      if (!found.has(name.id)) {
        const matches = matchesName(guess, name);
        if (matches) {
          const newFound = new Set(found);
          newFound.add(name.id);
          
          const allFound = newFound.size === names.length;
          
          set({ 
            found: newFound, 
            input: '',
            isCompleted: allFound,
            isActive: !allFound
          });

          if (allFound) {
            get().saveDailyResult(true);
          }
          
          return true;
        }
      }
    }
    return false;
  },

  tick: () => {
    const { timeLeft, isActive, isCompleted } = get();
    if (!isActive || isCompleted) return;

    if (timeLeft <= 1) {
      set({ timeLeft: 0, isActive: false, isCompleted: true });
      get().saveDailyResult(false);
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  setInput: (input: string) => {
    set({ input });
  },

  resetDaily: () => {
    set({
      names: [],
      found: new Set(),
      timeLeft: 5 * 60,
      isActive: false,
      isCompleted: false,
      input: '',
      todayCompleted: false
    });
  },

  saveDailyResult: async (completed: boolean) => {
    const { names, found, timeLeft } = get();
    const today = new Date().toISOString().split('T')[0];
    
    const result: DailyResult = {
      date: today,
      found: found.size,
      total: names.length,
      duration: (5 * 60 - timeLeft) * 1000,
      completed,
      names: Array.from(found)
    };
    
    await db.saveDailyResult(result);
    
    // Update streak
    const results = await db.getDailyResults();
    const streak = calculateCurrentStreak(results);
    const bestStreak = Math.max(...results.map(r => calculateStreakAtDate(results, r.date)));
    
    set({ currentStreak: streak, bestStreak });
  }
}));

function calculateCurrentStreak(results: DailyResult[]): number {
  const sortedDates = results
    .map(r => r.date)
    .sort((a, b) => b.localeCompare(a));
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let currentDate = new Date(today);
  
  for (const date of sortedDates) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (date === dateStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateStreakAtDate(results: DailyResult[], targetDate: string): number {
  const sortedDates = results
    .filter(r => r.date <= targetDate)
    .map(r => r.date)
    .sort((a, b) => b.localeCompare(a));
  
  let streak = 0;
  let currentDate = new Date(targetDate);
  
  for (const date of sortedDates) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (date === dateStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}
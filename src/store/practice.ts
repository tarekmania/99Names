import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NAMES } from '@/data/names';
import type { DivineName } from '@/data/names';
import { matchesName } from '@/utils/match';
import { db } from '@/utils/db';
import { fetchDivineNames } from '@/services/divineNamesApi';
import { supabase } from '@/integrations/supabase/client';

// Unified practice item types
export type PracticeItemType = 'review' | 'new' | 'reinforcement' | 'challenge';

export interface PracticeItem {
  id: string;
  type: PracticeItemType;
  nameId: number;
  name: DivineName;
  priority: number;
  estimatedTime: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
  // Spaced repetition data (for review items)
  interval?: number;
  easeFactor?: number;
  consecutiveCorrect?: number;
  lastReviewed?: Date;
  nextReview?: Date;
}

export interface SessionResult {
  timestamp: number;
  totalItems: number;
  completedItems: number;
  correctAnswers: number;
  sessionDuration: number;
  itemsReviewed: number;
  itemsLearned: number;
  itemsMastered: number;
  streakMaintained: boolean;
}

export interface PracticeStats {
  totalNames: number;
  masteredNames: number;
  learningNames: number;
  newNames: number;
  dueForReview: number;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  averageAccuracy: number;
  totalPracticeTime: number; // in minutes
}

interface PracticeState {
  // Core data
  allNames: DivineName[];
  currentSession: PracticeItem[];
  currentIndex: number;
  sessionActive: boolean;
  sessionCompleted: boolean;
  sessionStartTime: number;
  
  // Current item state
  showAnswer: boolean;
  selectedQuality: number | null;
  answerRevealed: boolean;
  isLoading: boolean;
  
  // Input state
  input: string;
  wrongInput: boolean;
  
  // Session results
  sessionResults: SessionResult | null;
  
  // Loading states
  loading: boolean;
  
  // Actions
  initializePractice: () => Promise<void>;
  generateSmartSession: (targetDuration?: number) => Promise<void>;
  startSession: () => void;
  submitAnswer: (input: string) => boolean;
  revealAnswer: () => void;
  submitQuality: (quality: number) => Promise<void>;
  nextItem: () => void;
  completeSession: () => Promise<void>;
  resetSession: () => void;
  
  // Utility actions
  setInput: (input: string) => void;
  clearFeedback: () => void;
  getStats: () => PracticeStats;
  getCurrentItem: () => PracticeItem | null;
}

// Smart session generation algorithm
const generateOptimalSession = async (
  allNames: DivineName[], 
  targetDuration: number = 900 // 15 minutes default
): Promise<PracticeItem[]> => {
  const session: PracticeItem[] = [];
  let currentTime = 0;
  
  // Get spaced repetition data
  const spacedRepItems = await getSpacedRepetitionItems();
  const dailyResults = await db.getDailyResults();
  
  // 1. Critical reviews (overdue spaced repetition items)
  const now = new Date();
  const overdueItems = spacedRepItems.filter(item => 
    item.nextReview <= now && 
    (now.getTime() - item.nextReview.getTime()) > 24 * 60 * 60 * 1000 // More than 1 day overdue
  );
  
  for (const item of overdueItems.slice(0, 3)) {
    const name = allNames.find(n => n.id === item.nameId);
    if (name && currentTime < targetDuration) {
      session.push({
        id: `review-${item.nameId}-${Date.now()}`,
        type: 'review',
        nameId: item.nameId,
        name,
        priority: 10, // Highest priority
        estimatedTime: 60,
        difficulty: 'hard',
        interval: item.interval,
        easeFactor: item.easeFactor,
        consecutiveCorrect: item.consecutiveCorrect,
        lastReviewed: item.lastReviewed,
        nextReview: item.nextReview,
      });
      currentTime += 60;
    }
  }
  
  // 2. Due reviews (scheduled for today)
  const dueItems = spacedRepItems.filter(item => 
    item.nextReview <= now && 
    !overdueItems.includes(item)
  );
  
  for (const item of dueItems.slice(0, 5)) {
    const name = allNames.find(n => n.id === item.nameId);
    if (name && currentTime < targetDuration) {
      session.push({
        id: `review-${item.nameId}-${Date.now()}`,
        type: 'review',
        nameId: item.nameId,
        name,
        priority: 8,
        estimatedTime: 45,
        difficulty: 'medium',
        interval: item.interval,
        easeFactor: item.easeFactor,
        consecutiveCorrect: item.consecutiveCorrect,
        lastReviewed: item.lastReviewed,
        nextReview: item.nextReview,
      });
      currentTime += 45;
    }
  }
  
  // 3. New content (if user is ready and has time)
  const learnedNameIds = new Set(spacedRepItems.map(item => item.nameId));
  const newNames = allNames.filter(name => !learnedNameIds.has(name.id));
  
  if (shouldIntroduceNewContent(spacedRepItems.length, session.length) && currentTime < targetDuration) {
    for (const name of newNames.slice(0, 3)) {
      if (currentTime < targetDuration) {
        session.push({
          id: `new-${name.id}-${Date.now()}`,
          type: 'new',
          nameId: name.id,
          name,
          priority: 6,
          estimatedTime: 90,
          difficulty: 'easy',
        });
        currentTime += 90;
      }
    }
  }
  
  // 4. Reinforcement (recently learned items that need strengthening)
  const recentItems = spacedRepItems.filter(item => 
    item.consecutiveCorrect < 3 && 
    item.lastReviewed && 
    (now.getTime() - item.lastReviewed.getTime()) < 7 * 24 * 60 * 60 * 1000 // Within last week
  );
  
  for (const item of recentItems.slice(0, 3)) {
    const name = allNames.find(n => n.id === item.nameId);
    if (name && currentTime < targetDuration) {
      session.push({
        id: `reinforcement-${item.nameId}-${Date.now()}`,
        type: 'reinforcement',
        nameId: item.nameId,
        name,
        priority: 4,
        estimatedTime: 30,
        difficulty: 'easy',
        interval: item.interval,
        easeFactor: item.easeFactor,
        consecutiveCorrect: item.consecutiveCorrect,
        lastReviewed: item.lastReviewed,
        nextReview: item.nextReview,
      });
      currentTime += 30;
    }
  }
  
  // 5. Fill remaining time with mixed practice if needed
  const remainingTime = targetDuration - currentTime;
  if (remainingTime > 60 && session.length < 15) {
    const additionalItems = Math.floor(remainingTime / 45);
    const mixedItems = [...dueItems, ...recentItems].slice(0, additionalItems);
    
    for (const item of mixedItems) {
      const name = allNames.find(n => n.id === item.nameId);
      if (name) {
        session.push({
          id: `mixed-${item.nameId}-${Date.now()}`,
          type: 'review',
          nameId: item.nameId,
          name,
          priority: 2,
          estimatedTime: 45,
          difficulty: 'medium',
          interval: item.interval,
          easeFactor: item.easeFactor,
          consecutiveCorrect: item.consecutiveCorrect,
          lastReviewed: item.lastReviewed,
          nextReview: item.nextReview,
        });
      }
    }
  }
  
  // Sort by priority and optimize order
  return optimizeSessionOrder(session);
};

// Helper functions
const getSpacedRepetitionItems = async () => {
  try {
    const { openDB } = await import('idb');
    const spacedRepDB = await openDB('SpacedRepetitionDB', 1);
    return await spacedRepDB.getAll('items') || [];
  } catch (error) {
    console.warn('Failed to load spaced repetition items:', error);
    return [];
  }
};

const shouldIntroduceNewContent = (totalLearned: number, sessionReviews: number): boolean => {
  // Don't introduce new content if user has too many reviews
  if (sessionReviews > 8) return false;
  
  // Introduce new content if user has learned fewer than 20 names
  if (totalLearned < 20) return true;
  
  // For experienced users, introduce new content more gradually
  return sessionReviews < 5;
};

const optimizeSessionOrder = (session: PracticeItem[]): PracticeItem[] => {
  // Sort by priority first
  session.sort((a, b) => b.priority - a.priority);
  
  // Then optimize for learning effectiveness
  const optimized: PracticeItem[] = [];
  const remaining = [...session];
  
  while (remaining.length > 0) {
    // Alternate between different types when possible
    const nextType = getNextOptimalType(optimized);
    const nextItem = remaining.find(item => item.type === nextType) || remaining[0];
    
    optimized.push(nextItem);
    remaining.splice(remaining.indexOf(nextItem), 1);
  }
  
  return optimized;
};

const getNextOptimalType = (completed: PracticeItem[]): PracticeItemType => {
  if (completed.length === 0) return 'review';
  
  const lastType = completed[completed.length - 1].type;
  const lastTwoTypes = completed.slice(-2).map(item => item.type);
  
  // Avoid too many of the same type in a row
  if (lastTwoTypes.every(type => type === 'review')) return 'new';
  if (lastTwoTypes.every(type => type === 'new')) return 'review';
  
  // Default progression
  switch (lastType) {
    case 'review': return 'new';
    case 'new': return 'reinforcement';
    case 'reinforcement': return 'review';
    default: return 'review';
  }
};

// SM-2 Algorithm for spaced repetition
const updateSpacedRepetition = (item: PracticeItem, quality: number): PracticeItem => {
  const now = new Date();
  
  if (quality < 3) {
    // Incorrect response - reset interval to 1
    return {
      ...item,
      interval: 1,
      consecutiveCorrect: 0,
      lastReviewed: now,
      nextReview: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
    };
  }
  
  // Correct response
  let newInterval: number;
  const consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
  
  if (consecutiveCorrect === 1) {
    newInterval = 1;
  } else if (consecutiveCorrect === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round((item.interval || 1) * (item.easeFactor || 2.5));
  }
  
  // Update ease factor based on quality
  const newEaseFactor = Math.max(
    1.3,
    (item.easeFactor || 2.5) + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  
  return {
    ...item,
    interval: newInterval,
    easeFactor: newEaseFactor,
    consecutiveCorrect,
    lastReviewed: now,
    nextReview,
  };
};

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      // Initial state
      allNames: [],
      currentSession: [],
      currentIndex: 0,
      sessionActive: false,
      sessionCompleted: false,
      sessionStartTime: 0,
      showAnswer: false,
      selectedQuality: null,
      answerRevealed: false,
      isLoading: false,
      input: '',
      wrongInput: false,
      sessionResults: null,
      loading: false,

      initializePractice: async () => {
        set({ loading: true });
        try {
          const names = await fetchDivineNames();
          set({ allNames: names, loading: false });
        } catch (error) {
          console.error('Failed to load names:', error);
          set({ allNames: NAMES, loading: false });
        }
      },

      generateSmartSession: async (targetDuration = 900) => {
        const { allNames } = get();
        set({ loading: true });
        
        try {
          const session = await generateOptimalSession(allNames, targetDuration);
          set({ 
            currentSession: session, 
            currentIndex: 0,
            sessionCompleted: false,
            sessionResults: null,
            loading: false 
          });
        } catch (error) {
          console.error('Failed to generate session:', error);
          set({ loading: false });
        }
      },

      startSession: () => {
        set({
          sessionActive: true,
          sessionStartTime: Date.now(),
          currentIndex: 0,
          showAnswer: false,
          selectedQuality: null,
          answerRevealed: false,
          input: '',
          wrongInput: false,
        });
      },

      submitAnswer: (input: string) => {
        const { currentSession, currentIndex } = get();
        const currentItem = currentSession[currentIndex];
        
        if (!currentItem || !input.trim()) return false;
        
        const isCorrect = matchesName(input.trim(), currentItem.name);
        
        if (isCorrect) {
          set({ 
            input: '', 
            wrongInput: false,
            answerRevealed: true,
            showAnswer: true 
          });
          return true;
        } else {
          set({ wrongInput: true });
          return false;
        }
      },

      revealAnswer: () => {
        set({ 
          showAnswer: true, 
          answerRevealed: true 
        });
      },

      submitQuality: async (quality: number) => {
        const { currentSession, currentIndex } = get();
        const currentItem = currentSession[currentIndex];
        
        if (!currentItem) return;
        
        set({ selectedQuality: quality });
        
        // Update spaced repetition data if this is a review item
        if (currentItem.type === 'review' || currentItem.type === 'reinforcement') {
          const updatedItem = updateSpacedRepetition(currentItem, quality);
          
          // Save to local database
          try {
            const { openDB } = await import('idb');
            const spacedRepDB = await openDB('SpacedRepetitionDB', 1, {
              upgrade(db) {
                if (!db.objectStoreNames.contains('items')) {
                  db.createObjectStore('items', { keyPath: 'nameId' });
                }
              },
            });
            
            await spacedRepDB.put('items', {
              nameId: updatedItem.nameId,
              interval: updatedItem.interval,
              easeFactor: updatedItem.easeFactor,
              consecutiveCorrect: updatedItem.consecutiveCorrect,
              lastReviewed: updatedItem.lastReviewed,
              nextReview: updatedItem.nextReview,
            });
          } catch (error) {
            console.warn('Failed to save spaced repetition data:', error);
          }
          
          // Save to Supabase if user is authenticated
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('spaced_repetition_items').upsert({
                user_id: user.id,
                name_id: updatedItem.nameId,
                interval_days: updatedItem.interval,
                ease_factor: updatedItem.easeFactor,
                consecutive_correct: updatedItem.consecutiveCorrect,
                last_reviewed: updatedItem.lastReviewed?.toISOString(),
                next_review: updatedItem.nextReview?.toISOString(),
              }, {
                onConflict: 'user_id,name_id'
              });
            }
          } catch (error) {
            console.warn('Failed to sync spaced repetition item to cloud:', error);
          }
        }
        
        // For new items, add to spaced repetition system
        if (currentItem.type === 'new') {
          const newSpacedRepItem = {
            nameId: currentItem.nameId,
            interval: quality >= 3 ? 1 : 0,
            easeFactor: 2.5,
            consecutiveCorrect: quality >= 3 ? 1 : 0,
            lastReviewed: new Date(),
            nextReview: new Date(Date.now() + (quality >= 3 ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)),
          };
          
          // Save to local database
          try {
            const { openDB } = await import('idb');
            const spacedRepDB = await openDB('SpacedRepetitionDB', 1, {
              upgrade(db) {
                if (!db.objectStoreNames.contains('items')) {
                  db.createObjectStore('items', { keyPath: 'nameId' });
                }
              },
            });
            
            await spacedRepDB.put('items', newSpacedRepItem);
          } catch (error) {
            console.warn('Failed to save new spaced repetition item:', error);
          }
        }
        
        // Auto-advance after a short delay
        setTimeout(() => {
          get().nextItem();
        }, 1500);
      },

      nextItem: () => {
        const { currentSession, currentIndex } = get();
        const nextIndex = currentIndex + 1;
        
        if (nextIndex >= currentSession.length) {
          get().completeSession();
        } else {
          set({
            currentIndex: nextIndex,
            showAnswer: false,
            selectedQuality: null,
            answerRevealed: false,
            input: '',
            wrongInput: false,
            isLoading: true,
          });
          
          // Small delay for smooth transition
          setTimeout(() => {
            set({ isLoading: false });
          }, 300);
        }
      },

      completeSession: async () => {
        const { currentSession, sessionStartTime } = get();
        const sessionDuration = Date.now() - sessionStartTime;
        
        // Calculate session results
        const results: SessionResult = {
          timestamp: Date.now(),
          totalItems: currentSession.length,
          completedItems: currentSession.length,
          correctAnswers: currentSession.length, // Simplified for now
          sessionDuration,
          itemsReviewed: currentSession.filter(item => item.type === 'review' || item.type === 'reinforcement').length,
          itemsLearned: currentSession.filter(item => item.type === 'new').length,
          itemsMastered: 0, // Calculate based on quality ratings
          streakMaintained: true, // Calculate based on daily completion
        };
        
        // Save session result
        try {
          await db.saveGameResult({
            timestamp: results.timestamp,
            found: results.correctAnswers,
            durationMs: results.sessionDuration,
            completed: true,
          });
          
          // Save to Supabase if authenticated
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('game_results').insert({
              user_id: user.id,
              timestamp: results.timestamp,
              found_count: results.correctAnswers,
              duration_ms: results.sessionDuration,
              completed: true,
            });
          }
        } catch (error) {
          console.warn('Failed to save session results:', error);
        }
        
        set({
          sessionActive: false,
          sessionCompleted: true,
          sessionResults: results,
        });
      },

      resetSession: () => {
        set({
          currentSession: [],
          currentIndex: 0,
          sessionActive: false,
          sessionCompleted: false,
          sessionStartTime: 0,
          showAnswer: false,
          selectedQuality: null,
          answerRevealed: false,
          input: '',
          wrongInput: false,
          sessionResults: null,
          isLoading: false,
        });
      },

      setInput: (input: string) => {
        set({ input });
      },

      clearFeedback: () => {
        set({ wrongInput: false });
      },

      getStats: (): PracticeStats => {
        // This will be implemented to calculate real-time stats
        return {
          totalNames: get().allNames.length,
          masteredNames: 0,
          learningNames: 0,
          newNames: 0,
          dueForReview: 0,
          currentStreak: 0,
          bestStreak: 0,
          totalSessions: 0,
          averageAccuracy: 0,
          totalPracticeTime: 0,
        };
      },

      getCurrentItem: () => {
        const { currentSession, currentIndex } = get();
        return currentSession[currentIndex] || null;
      },
    }),
    {
      name: 'practice-storage',
      partialize: (state) => ({
        sessionCompleted: state.sessionCompleted,
        sessionResults: state.sessionResults,
      }),
    }
  )
);

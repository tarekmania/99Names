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
  getStats: () => Promise<PracticeStats>;
  getCurrentItem: () => PracticeItem | null;
}

// Simplified smart session generation algorithm
const generateOptimalSession = async (
  allNames: DivineName[], 
  targetDuration: number = 900 // 15 minutes default
): Promise<PracticeItem[]> => {
  const session: PracticeItem[] = [];
  const maxItems = Math.min(20, Math.floor(targetDuration / 45)); // ~45 seconds per item
  
  // Get spaced repetition data
  const spacedRepItems = await getSpacedRepetitionItems();
  const now = new Date();
  
  // 1. Priority: Due and overdue reviews
  const dueItems = spacedRepItems.filter(item => 
    item.nextReview && new Date(item.nextReview) <= now
  ).sort((a, b) => {
    // Sort by how overdue they are (most overdue first)
    const aOverdue = now.getTime() - new Date(a.nextReview).getTime();
    const bOverdue = now.getTime() - new Date(b.nextReview).getTime();
    return bOverdue - aOverdue;
  });
  
  // Add due reviews (limit to prevent overwhelming)
  const reviewLimit = Math.min(Math.floor(maxItems * 0.7), dueItems.length);
  for (let i = 0; i < reviewLimit; i++) {
    const item = dueItems[i];
    const name = allNames.find(n => n.id === item.nameId);
    if (name) {
      session.push({
        id: `review-${item.nameId}-${Date.now()}-${i}`,
        type: 'review',
        nameId: item.nameId,
        name,
        priority: 10 - i, // Higher priority for more overdue items
        estimatedTime: 45,
        difficulty: item.consecutiveCorrect < 2 ? 'hard' : 'medium',
        interval: item.interval,
        easeFactor: item.easeFactor,
        consecutiveCorrect: item.consecutiveCorrect,
        lastReviewed: new Date(item.lastReviewed),
        nextReview: new Date(item.nextReview),
      });
    }
  }
  
  // 2. Add new content if there's space and user is ready
  const learnedNameIds = new Set(spacedRepItems.map(item => item.nameId));
  const newNames = allNames.filter(name => !learnedNameIds.has(name.id));
  
  // Only introduce new content if we don't have too many reviews
  if (session.length < maxItems * 0.8 && newNames.length > 0) {
    const newItemsToAdd = Math.min(3, maxItems - session.length, newNames.length);
    
    for (let i = 0; i < newItemsToAdd; i++) {
      const name = newNames[i];
      session.push({
        id: `new-${name.id}-${Date.now()}-${i}`,
        type: 'new',
        nameId: name.id,
        name,
        priority: 5,
        estimatedTime: 60,
        difficulty: 'easy',
      });
    }
  }
  
  // 3. Fill remaining slots with reinforcement of weak items
  if (session.length < maxItems) {
    const weakItems = spacedRepItems.filter(item => 
      item.consecutiveCorrect < 3 && 
      !session.some(s => s.nameId === item.nameId) // Don't duplicate
    ).sort((a, b) => (a.consecutiveCorrect || 0) - (b.consecutiveCorrect || 0));
    
    const slotsRemaining = maxItems - session.length;
    for (let i = 0; i < Math.min(slotsRemaining, weakItems.length); i++) {
      const item = weakItems[i];
      const name = allNames.find(n => n.id === item.nameId);
      if (name) {
        session.push({
          id: `reinforcement-${item.nameId}-${Date.now()}-${i}`,
          type: 'reinforcement',
          nameId: item.nameId,
          name,
          priority: 3,
          estimatedTime: 40,
          difficulty: 'easy',
          interval: item.interval,
          easeFactor: item.easeFactor,
          consecutiveCorrect: item.consecutiveCorrect,
          lastReviewed: new Date(item.lastReviewed),
          nextReview: new Date(item.nextReview),
        });
      }
    }
  }
  
  // Simple ordering: reviews first, then new items, then reinforcement
  return session.sort((a, b) => {
    if (a.type !== b.type) {
      const typeOrder = { review: 0, new: 1, reinforcement: 2, challenge: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return b.priority - a.priority;
  });
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

// Helper function to determine if session is well-balanced
const isSessionBalanced = (session: PracticeItem[]): boolean => {
  if (session.length === 0) return false;
  
  const reviewCount = session.filter(item => item.type === 'review').length;
  const totalItems = session.length;
  
  // Good balance: 60-80% reviews, rest new/reinforcement
  const reviewRatio = reviewCount / totalItems;
  return reviewRatio >= 0.6 && reviewRatio <= 0.8;
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
        
        // Debug logging to identify matching issues
        console.log('🔍 Name Matching Debug:', {
          input: input.trim(),
          targetName: currentItem.name.englishName,
          targetAliases: currentItem.name.aliases,
          nameId: currentItem.nameId
        });
        
        const isCorrect = matchesName(input.trim(), currentItem.name);
        
        console.log('✅ Match Result:', isCorrect);
        
        if (isCorrect) {
          console.log('🎉 Correct match found!');
          set({ 
            input: '', 
            wrongInput: false,
            answerRevealed: true,
            showAnswer: true 
          });
          return true;
        } else {
          console.log('❌ No match found');
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
        
        // Auto-navigate back to menu after 5 seconds
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname === '/practice') {
            window.location.href = '/';
          }
        }, 5000);
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

      getStats: async (): Promise<PracticeStats> => {
        const { allNames } = get();
        
        try {
          // Get spaced repetition data for real statistics
          const spacedRepItems = await getSpacedRepetitionItems();
          const now = new Date();
          
          // Calculate real statistics
          const totalNames = allNames.length;
          const learningNames = spacedRepItems.length;
          
          // Mastered = items with 5+ consecutive correct answers
          const masteredNames = spacedRepItems.filter(item => 
            (item.consecutiveCorrect || 0) >= 5
          ).length;
          
          // Due for review = items with nextReview <= now
          const dueForReview = spacedRepItems.filter(item => 
            item.nextReview && new Date(item.nextReview) <= now
          ).length;
          
          // New names = total - learning
          const newNames = totalNames - learningNames;
          
          // Learning names = learning but not mastered
          const actualLearningNames = learningNames - masteredNames;
          
          return {
            totalNames,
            masteredNames,
            learningNames: actualLearningNames,
            newNames,
            dueForReview,
            currentStreak: 0, // TODO: Implement practice streak calculation
            bestStreak: 0, // TODO: Implement best practice streak
            totalSessions: 0, // TODO: Implement session counting
            averageAccuracy: 0, // TODO: Implement accuracy calculation
            totalPracticeTime: 0, // TODO: Implement time tracking
          };
        } catch (error) {
          console.warn('Failed to calculate practice stats:', error);
          // Fallback to basic stats
          return {
            totalNames: allNames.length,
            masteredNames: 0,
            learningNames: 0,
            newNames: allNames.length,
            dueForReview: 0,
            currentStreak: 0,
            bestStreak: 0,
            totalSessions: 0,
            averageAccuracy: 0,
            totalPracticeTime: 0,
          };
        }
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

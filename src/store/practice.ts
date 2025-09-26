import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NAMES } from '@/data/names';
import type { DivineName } from '@/data/names';
import { matchesName } from '@/utils/match';
import { db } from '@/utils/db';
import { fetchDivineNames } from '@/services/divineNamesApi';
import { supabase } from '@/integrations/supabase/client';
import { spacedRepetitionDB, type SpacedRepetitionItem } from '@/utils/spacedRepetitionDB';

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
        lastReviewed: new Date(item.lastReview || 0),
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
          lastReviewed: new Date(item.lastReview || 0),
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
const getSpacedRepetitionItems = async (): Promise<SpacedRepetitionItem[]> => {
  try {
    return await spacedRepetitionDB.loadItems();
  } catch (error) {
    console.warn('Failed to load spaced repetition data:', error);    
    return [];
  }
};

// Fallback session creation for when smart generation fails
const createFallbackSession = (allNames: DivineName[], targetDuration: number): PracticeItem[] => {
  const maxItems = Math.min(10, Math.floor(targetDuration / 60)); // Simpler calculation for fallback
  const session: PracticeItem[] = [];
  
  // Just create a simple session with the first few names
  for (let i = 0; i < Math.min(maxItems, allNames.length); i++) {
    const name = allNames[i];
    session.push({
      id: `fallback-${name.id}-${Date.now()}-${i}`,
      type: 'new',
      nameId: name.id,
      name,
      priority: 5,
      estimatedTime: 60,
      difficulty: 'easy',
    });
  }
  
  return session;
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
          
          // If session is empty, create a fallback session
          if (session.length === 0 && allNames.length > 0) {
            console.warn('Smart session generation returned empty, creating fallback session');
            const fallbackSession = createFallbackSession(allNames, targetDuration);
            set({ 
              currentSession: fallbackSession, 
              currentIndex: 0,
              sessionCompleted: false,
              sessionResults: null,
              loading: false 
            });
          } else {
            set({ 
              currentSession: session, 
              currentIndex: 0,
              sessionCompleted: false,
              sessionResults: null,
              loading: false 
            });
          }
        } catch (error) {
          console.error('Failed to generate session:', error);
          
          // Create fallback session on error
          if (allNames.length > 0) {
            console.log('Creating fallback session due to error');
            const fallbackSession = createFallbackSession(allNames, targetDuration);
            set({ 
              currentSession: fallbackSession, 
              currentIndex: 0,
              sessionCompleted: false,
              sessionResults: null,
              loading: false 
            });
          } else {
            set({ loading: false });
          }
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
          
          // Save to local database using centralized manager
          try {
            const spacedRepItem: SpacedRepetitionItem = {
              nameId: updatedItem.nameId,
              interval: updatedItem.interval || 1,
              repetition: updatedItem.consecutiveCorrect || 0,
              easeFactor: updatedItem.easeFactor || 2.5,
              consecutiveCorrect: updatedItem.consecutiveCorrect || 0,
              lastReview: updatedItem.lastReviewed || new Date(),
              nextReview: updatedItem.nextReview || new Date(),
              stage: 'learning',
            };
            
            await spacedRepetitionDB.saveItems([spacedRepItem]);
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
          const newSpacedRepItem: SpacedRepetitionItem = {
            nameId: currentItem.nameId,
            interval: quality >= 3 ? 1 : 0,
            repetition: quality >= 3 ? 1 : 0,
            easeFactor: 2.5,
            consecutiveCorrect: quality >= 3 ? 1 : 0,
            lastReview: new Date(),
            nextReview: new Date(Date.now() + (quality >= 3 ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)),
            stage: quality >= 3 ? 'learning' : 'new',
          };
          
          // Save to local database using centralized manager
          try {
            await spacedRepetitionDB.saveItems([newSpacedRepItem]);
          } catch (error) {
            console.warn('Failed to save new spaced repetition item:', error);
          }
          
          // Save to Supabase if user is authenticated
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('spaced_repetition_items').upsert({
                user_id: user.id,
                name_id: newSpacedRepItem.nameId,
                interval_days: newSpacedRepItem.interval,
                ease_factor: newSpacedRepItem.easeFactor,
                consecutive_correct: newSpacedRepItem.consecutiveCorrect,
                last_reviewed: newSpacedRepItem.lastReview?.toISOString(),
                next_review: newSpacedRepItem.nextReview.toISOString(),
              }, {
                onConflict: 'user_id,name_id'
              });
            }
          } catch (error) {
            console.warn('Failed to sync new spaced repetition item to cloud:', error);
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
          streakMaintained: true,
        };
        
        // Save session results
        try {
          await db.saveGameResult({
            timestamp: results.timestamp,
            found: results.correctAnswers,
            durationMs: results.sessionDuration,
            difficulty: 'normal',
            score: results.correctAnswers * 100,
            mode: 'practice',
          });
        } catch (error) {
          console.warn('Failed to save session results:', error);
        }
        
        set({
          sessionCompleted: true,
          sessionActive: false,
          sessionResults: results,
        });
      },

      resetSession: () => {
        set({
          currentSession: [],
          currentIndex: 0,
          sessionActive: false,
          sessionCompleted: false,
          sessionResults: null,
          showAnswer: false,
          selectedQuality: null,
          answerRevealed: false,
          input: '',
          wrongInput: false,
          isLoading: false,
        });
      },

      setInput: (input: string) => {
        set({ input, wrongInput: false });
      },

      clearFeedback: () => {
        set({ wrongInput: false });
      },

      getStats: async (): Promise<PracticeStats> => {
        try {
          const spacedRepItems = await spacedRepetitionDB.loadItems();
          const now = new Date();
          
          const dueForReview = spacedRepItems.filter(item => {
            try {
              const nextReview = typeof item.nextReview === 'string' ? new Date(item.nextReview) : item.nextReview;
              return nextReview <= now;
            } catch (error) {
              return false;
            }
          }).length;
          
          const masteredNames = spacedRepItems.filter(item => 
            item.stage === 'mature' && item.consecutiveCorrect >= 5
          ).length;
          
          const learningNames = spacedRepItems.filter(item => 
            item.stage === 'learning' || item.stage === 'young'
          ).length;
          
          const newNames = Math.max(0, NAMES.length - spacedRepItems.length);
          
          return {
            totalNames: NAMES.length,
            masteredNames,
            learningNames,
            newNames,
            dueForReview,
            currentStreak: 0, // Will implement streak tracking later
            bestStreak: 0,
            totalSessions: 0,
            averageAccuracy: 0,
            totalPracticeTime: 0,
          };
        } catch (error) {
          console.error('Failed to get practice stats:', error);
          return {
            totalNames: NAMES.length,
            masteredNames: 0,
            learningNames: 0,
            newNames: NAMES.length,
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
        sessionActive: state.sessionActive,
        sessionCompleted: state.sessionCompleted,
        sessionStartTime: state.sessionStartTime,
        currentSession: state.currentSession,
        currentIndex: state.currentIndex,
        sessionResults: state.sessionResults,
      }),
    }
  )
);
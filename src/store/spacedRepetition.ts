import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NAMES } from '@/data/names';
import { openDB, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';

interface SpacedRepetitionItem {
  nameId: number;
  interval: number; // Days until next review
  easeFactor: number; // 2.5 is default
  consecutiveCorrect: number;
  lastReviewed: Date;
  nextReview: Date;
  stage: 'new' | 'learning' | 'young' | 'mature';
}

interface ReviewSession {
  item: SpacedRepetitionItem;
  name: typeof NAMES[0];
}

interface SpacedRepetitionState {
  items: SpacedRepetitionItem[];
  currentSession: ReviewSession[];
  currentIndex: number;
  sessionCompleted: boolean;
  sessionStarted: boolean;
  todayReviewed: number;
  lastResetDate: string;
  sessionStats: { correct: number; total: number };
  loading: boolean;
  
  // Actions
  initializeItems: () => Promise<void>;
  startReviewSession: () => void;
  submitAnswer: (quality: number) => void; // 0-5 SM-2 quality rating
  resetSession: () => void;
  getCurrentItem: () => ReviewSession | null;
  getStats: () => { 
    due: number; 
    total: number; 
    reviewed: number; 
    newItems: number;
    learningItems: number;
    youngItems: number;
    matureItems: number;
  };
  resetDailyProgress: () => void;
}

// Determine learning stage based on item properties
const getItemStage = (item: SpacedRepetitionItem): SpacedRepetitionItem['stage'] => {
  if (item.consecutiveCorrect === 0 && item.lastReviewed.getTime() === 0) return 'new';
  if (item.consecutiveCorrect < 2) return 'learning';
  if (item.interval < 21) return 'young';
  return 'mature';
};

// SM-2 Algorithm implementation with improved progression
const updateSpacedRepetition = (item: SpacedRepetitionItem, quality: number): SpacedRepetitionItem => {
  const now = new Date();
  
  if (quality < 3) {
    // Incorrect response - reset to learning stage
    const newItem = {
      ...item,
      interval: Math.max(1, Math.floor(item.interval * 0.2)), // Reduce interval significantly but not to 1 always
      consecutiveCorrect: 0,
      lastReviewed: now,
      nextReview: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      stage: 'learning' as const,
    };
    return newItem;
  }
  
  // Correct response - progressive intervals
  let newInterval: number;
  if (item.consecutiveCorrect === 0) {
    newInterval = 1; // First correct answer: review tomorrow
  } else if (item.consecutiveCorrect === 1) {
    newInterval = 3; // Second correct: review in 3 days
  } else if (item.consecutiveCorrect === 2) {
    newInterval = 7; // Third correct: review in a week
  } else {
    newInterval = Math.round(item.interval * item.easeFactor);
  }
  
  // Update ease factor based on quality (SM-2 formula)
  const newEaseFactor = Math.max(
    1.3,
    item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  
  const updatedItem = {
    ...item,
    interval: newInterval,
    easeFactor: newEaseFactor,
    consecutiveCorrect: item.consecutiveCorrect + 1,
    lastReviewed: now,
    nextReview,
    stage: getItemStage({...item, consecutiveCorrect: item.consecutiveCorrect + 1, interval: newInterval}),
  };
  
  return updatedItem;
};

// Database management
let db: IDBPDatabase;

const initDB = async () => {
  db = await openDB('SpacedRepetitionDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'nameId' });
      }
    },
  });
};

const saveItems = async (items: SpacedRepetitionItem[]) => {
  if (!db) await initDB();
  const tx = db.transaction('items', 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
  }
};

const loadItems = async (): Promise<SpacedRepetitionItem[]> => {
  if (!db) await initDB();
  return await db.getAll('items');
};

export const useSpacedRepetitionStore = create<SpacedRepetitionState>()(
  persist(
    (set, get) => ({
      items: [],
      currentSession: [],
      currentIndex: 0,
      sessionCompleted: false,
      sessionStarted: false,
      todayReviewed: 0,
      lastResetDate: new Date().toDateString(),
      sessionStats: { correct: 0, total: 0 },
      loading: false,

      initializeItems: async () => {
        set({ loading: true });
        try {
          let items = await loadItems();
          
          // Initialize items for names that don't exist yet
          const existingIds = new Set(items.map(item => item.nameId));
          const now = new Date();
          
          const newItems = NAMES
            .filter(name => !existingIds.has(name.id))
            .map((name, index) => ({
              nameId: name.id,
              interval: 1,
              easeFactor: 2.5,
              consecutiveCorrect: 0,
              lastReviewed: new Date(0), // Never reviewed
              // Stagger new items over time instead of all at once
              nextReview: new Date(now.getTime() + index * 2 * 60 * 60 * 1000), // Stagger by 2 hours
              stage: 'new' as const,
            }));
          
          items = [...items, ...newItems];
          
          if (newItems.length > 0) {
            await saveItems(newItems);
          }
          
          set({ items, loading: false });
        } catch (error) {
          console.error('Failed to initialize spaced repetition items:', error);
          set({ loading: false });
        }
      },

      startReviewSession: () => {
        const { items, resetDailyProgress } = get();
        const now = new Date();
        
        // Reset daily progress if needed
        resetDailyProgress();
        
        // Get items due for review
        const dueItems = items.filter(item => item.nextReview <= now);
        
        // Prioritize by stage: reviews first, then new items
        const reviews = dueItems.filter(item => item.stage !== 'new');
        const newItems = dueItems.filter(item => item.stage === 'new');
        
        // Limit new items per session to avoid overwhelming
        const maxNewItems = Math.min(5, newItems.length);
        const maxReviews = Math.min(15, reviews.length);
        
        const sessionItems = [
          ...reviews.slice(0, maxReviews),
          ...newItems.slice(0, maxNewItems)
        ];
        
        // Shuffle to mix reviews and new items
        const shuffledItems = sessionItems.sort(() => Math.random() - 0.5);
        
        const currentSession = shuffledItems.map(item => ({
          item,
          name: NAMES.find(name => name.id === item.nameId)!,
        }));
        
        set({
          currentSession,
          currentIndex: 0,
          sessionCompleted: false,
          sessionStarted: true,
          sessionStats: { correct: 0, total: 0 },
        });
      },

      submitAnswer: async (quality: number) => {
        const { currentSession, currentIndex, items, todayReviewed, sessionStats } = get();
        
        if (!currentSession[currentIndex]) return;
        
        const currentItem = currentSession[currentIndex].item;
        const updatedItem = updateSpacedRepetition(currentItem, quality);
        
        // Update items array
        const updatedItems = items.map(item => 
          item.nameId === updatedItem.nameId ? updatedItem : item
        );
        
        // Save to local database
        saveItems([updatedItem]);
        
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
              last_reviewed: updatedItem.lastReviewed.toISOString(),
              next_review: updatedItem.nextReview.toISOString(),
            }, {
              onConflict: 'user_id,name_id'
            });
          }
        } catch (error) {
          console.warn('Failed to sync spaced repetition item to cloud:', error);
        }
        
        const nextIndex = currentIndex + 1;
        const completed = nextIndex >= currentSession.length;
        const isCorrect = quality >= 3;
        
        set({
          items: updatedItems,
          currentIndex: nextIndex,
          sessionCompleted: completed,
          todayReviewed: todayReviewed + 1,
          sessionStats: {
            correct: sessionStats.correct + (isCorrect ? 1 : 0),
            total: sessionStats.total + 1,
          },
        });
      },

      resetSession: () => {
        set({
          currentSession: [],
          currentIndex: 0,
          sessionCompleted: false,
          sessionStarted: false,
        });
      },

      getCurrentItem: () => {
        const { currentSession, currentIndex } = get();
        return currentSession[currentIndex] || null;
      },

      getStats: () => {
        const { items, todayReviewed } = get();
        const now = new Date();
        const due = items.filter(item => item.nextReview <= now).length;
        
        // Categorize items by stage
        const newItems = items.filter(item => item.stage === 'new').length;
        const learningItems = items.filter(item => item.stage === 'learning').length;
        const youngItems = items.filter(item => item.stage === 'young').length;
        const matureItems = items.filter(item => item.stage === 'mature').length;
        
        return {
          due,
          total: items.length,
          reviewed: todayReviewed,
          newItems,
          learningItems,
          youngItems,
          matureItems,
        };
      },

      resetDailyProgress: () => {
        const today = new Date().toDateString();
        const { lastResetDate } = get();
        
        if (lastResetDate !== today) {
          set({
            todayReviewed: 0,
            lastResetDate: today,
            sessionStats: { correct: 0, total: 0 },
          });
        }
      },
    }),
    {
      name: 'spaced-repetition-storage',
      partialize: (state) => ({
        todayReviewed: state.todayReviewed,
        lastResetDate: state.lastResetDate,
        sessionStarted: state.sessionStarted,
        sessionCompleted: state.sessionCompleted,
        sessionStats: state.sessionStats,
      }),
    }
  )
);

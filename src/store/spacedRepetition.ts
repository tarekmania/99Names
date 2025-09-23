import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NAMES } from '@/data/names';
import { openDB, IDBPDatabase } from 'idb';

interface SpacedRepetitionItem {
  nameId: number;
  interval: number; // Days until next review
  easeFactor: number; // 2.5 is default
  consecutiveCorrect: number;
  lastReviewed: Date;
  nextReview: Date;
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
  loading: boolean;
  
  // Actions
  initializeItems: () => Promise<void>;
  startReviewSession: () => void;
  submitAnswer: (quality: number) => void; // 0-5 SM-2 quality rating
  resetSession: () => void;
  getCurrentItem: () => ReviewSession | null;
  getStats: () => { due: number; total: number; reviewed: number };
}

// SM-2 Algorithm implementation
const updateSpacedRepetition = (item: SpacedRepetitionItem, quality: number): SpacedRepetitionItem => {
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
  if (item.consecutiveCorrect === 0) {
    newInterval = 1;
  } else if (item.consecutiveCorrect === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(item.interval * item.easeFactor);
  }
  
  // Update ease factor based on quality
  const newEaseFactor = Math.max(
    1.3,
    item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  
  return {
    ...item,
    interval: newInterval,
    easeFactor: newEaseFactor,
    consecutiveCorrect: item.consecutiveCorrect + 1,
    lastReviewed: now,
    nextReview,
  };
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
            .map(name => ({
              nameId: name.id,
              interval: 1,
              easeFactor: 2.5,
              consecutiveCorrect: 0,
              lastReviewed: new Date(0), // Never reviewed
              nextReview: now, // Available for review immediately
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
        const { items } = get();
        const now = new Date();
        
        // Get items due for review
        const dueItems = items.filter(item => item.nextReview <= now);
        
        // Limit session to 20 items max for daily practice
        const sessionItems = dueItems.slice(0, 20);
        
        const currentSession = sessionItems.map(item => ({
          item,
          name: NAMES.find(name => name.id === item.nameId)!,
        }));
        
        set({
          currentSession,
          currentIndex: 0,
          sessionCompleted: false,
          sessionStarted: true,
        });
      },

      submitAnswer: (quality: number) => {
        const { currentSession, currentIndex, items, todayReviewed } = get();
        
        if (!currentSession[currentIndex]) return;
        
        const currentItem = currentSession[currentIndex].item;
        const updatedItem = updateSpacedRepetition(currentItem, quality);
        
        // Update items array
        const updatedItems = items.map(item => 
          item.nameId === updatedItem.nameId ? updatedItem : item
        );
        
        // Save to database
        saveItems([updatedItem]);
        
        const nextIndex = currentIndex + 1;
        const completed = nextIndex >= currentSession.length;
        
        set({
          items: updatedItems,
          currentIndex: nextIndex,
          sessionCompleted: completed,
          todayReviewed: todayReviewed + 1,
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
        
        return {
          due,
          total: items.length,
          reviewed: todayReviewed,
        };
      },
    }),
    {
      name: 'spaced-repetition-storage',
      partialize: (state) => ({
        todayReviewed: state.todayReviewed,
        sessionStarted: state.sessionStarted,
        sessionCompleted: state.sessionCompleted,
      }),
    }
  )
);
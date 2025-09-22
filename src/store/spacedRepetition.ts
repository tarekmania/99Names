import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchDivineNames } from '@/services/divineNamesApi';
import { NAMES as fallbackNames } from '@/data/names';
import { db } from '@/utils/db';

export interface SpacedRepetitionItem {
  id: number;
  interval: number; // days until next review
  repetitions: number; // number of successful repetitions
  easeFactor: number; // how easy this item is (1.3 - 2.5)
  nextReviewDate: Date;
  lastReviewDate?: Date;
  quality?: number; // last answer quality (0-5)
}

export interface SpacedRepetitionResult {
  timestamp: number;
  nameId: number;
  quality: number;
  previousInterval: number;
  newInterval: number;
}

export interface SpacedRepetitionState {
  items: Map<number, SpacedRepetitionItem>;
  currentName: any | null;
  dueNames: any[];
  isLoading: boolean;
  input: string;
  feedback: string;
  isAnswerShown: boolean;
  sessionStats: {
    reviewed: number;
    correct: number;
    incorrect: number;
  };
}

export interface SpacedRepetitionActions {
  loadItems: () => Promise<void>;
  getNextName: () => void;
  submitAnswer: (quality: number) => Promise<void>;
  showAnswer: () => void;
  setInput: (input: string) => void;
  clearFeedback: () => void;
  resetSession: () => void;
  getDueCount: () => number;
}

export type SpacedRepetitionStore = SpacedRepetitionState & SpacedRepetitionActions;

// Spaced repetition algorithm (SM-2)
const calculateNextInterval = (item: SpacedRepetitionItem, quality: number): SpacedRepetitionItem => {
  let { interval, repetitions, easeFactor } = item;
  
  if (quality >= 3) {
    // Correct answer
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect answer
    repetitions = 0;
    interval = 1;
  }
  
  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  
  return {
    ...item,
    interval,
    repetitions,
    easeFactor,
    nextReviewDate,
    lastReviewDate: new Date(),
    quality
  };
};

export const useSpacedRepetitionStore = create<SpacedRepetitionStore>()(
  devtools(
    (set, get) => ({
      items: new Map(),
      currentName: null,
      dueNames: [],
      isLoading: true,
      input: '',
      feedback: '',
      isAnswerShown: false,
      sessionStats: {
        reviewed: 0,
        correct: 0,
        incorrect: 0,
      },

      loadItems: async () => {
        set({ isLoading: true });
        
        try {
          // Load names data
          let allNames;
          try {
            allNames = await fetchDivineNames();
          } catch (error) {
            console.warn('Failed to load from API, using fallback names');
            allNames = fallbackNames;
          }

          // Load existing spaced repetition data
          const existingItems = await db.getSpacedRepetitionItems();
          const itemsMap = new Map<number, SpacedRepetitionItem>();
          
          // Initialize all names with default SR data if not exists
          allNames.forEach(name => {
            const existing = existingItems.find(item => item.id === name.id);
            if (existing) {
              itemsMap.set(name.id, {
                ...existing,
                nextReviewDate: new Date(existing.nextReviewDate),
                lastReviewDate: existing.lastReviewDate ? new Date(existing.lastReviewDate) : undefined
              });
            } else {
              // New item - schedule for immediate review
              itemsMap.set(name.id, {
                id: name.id,
                interval: 1,
                repetitions: 0,
                easeFactor: 2.5,
                nextReviewDate: new Date(), // Due now
              });
            }
          });

          // Find due names
          const now = new Date();
          const dueNames = allNames.filter(name => {
            const item = itemsMap.get(name.id);
            return item && item.nextReviewDate <= now;
          });

          set({ 
            items: itemsMap,
            dueNames,
            isLoading: false 
          });
          
          // Auto-select first due name
          get().getNextName();
        } catch (error) {
          console.error('Failed to load spaced repetition items:', error);
          set({ isLoading: false });
        }
      },

      getNextName: () => {
        const { dueNames } = get();
        
        if (dueNames.length > 0) {
          // Select a random due name
          const randomIndex = Math.floor(Math.random() * dueNames.length);
          const nextName = dueNames[randomIndex];
          
          set({ 
            currentName: nextName,
            input: '',
            feedback: '',
            isAnswerShown: false 
          });
        } else {
          set({ currentName: null });
        }
      },

      submitAnswer: async (quality: number) => {
        const { currentName, items, sessionStats } = get();
        
        if (!currentName) return;

        const currentItem = items.get(currentName.id);
        if (!currentItem) return;

        // Calculate new interval
        const updatedItem = calculateNextInterval(currentItem, quality);
        
        // Update items map
        const newItems = new Map(items);
        newItems.set(currentName.id, updatedItem);
        
        // Update session stats
        const newStats = {
          reviewed: sessionStats.reviewed + 1,
          correct: sessionStats.correct + (quality >= 3 ? 1 : 0),
          incorrect: sessionStats.incorrect + (quality < 3 ? 1 : 0),
        };
        
        // Save to database
        try {
          await db.saveSpacedRepetitionItem(updatedItem);
          
          const result: SpacedRepetitionResult = {
            timestamp: Date.now(),
            nameId: currentName.id,
            quality,
            previousInterval: currentItem.interval,
            newInterval: updatedItem.interval,
          };
          await db.saveSpacedRepetitionResult(result);
        } catch (error) {
          console.error('Failed to save spaced repetition progress:', error);
        }

        // Update due names (remove current name if not due anymore)
        const now = new Date();
        const updatedDueNames = get().dueNames.filter(name => 
          name.id !== currentName.id || updatedItem.nextReviewDate <= now
        );

        set({ 
          items: newItems,
          dueNames: updatedDueNames,
          sessionStats: newStats,
          feedback: quality >= 3 ? 'Correct!' : 'Keep practicing!'
        });

        // Clear feedback after delay and get next name
        setTimeout(() => {
          get().clearFeedback();
          get().getNextName();
        }, 1500);
      },

      showAnswer: () => {
        set({ isAnswerShown: true });
      },

      setInput: (input: string) => {
        set({ input });
      },

      clearFeedback: () => {
        set({ feedback: '' });
      },

      resetSession: () => {
        set({
          sessionStats: {
            reviewed: 0,
            correct: 0,
            incorrect: 0,
          },
          currentName: null,
          input: '',
          feedback: '',
          isAnswerShown: false,
        });
        get().getNextName();
      },

      getDueCount: () => {
        return get().dueNames.length;
      },
    }),
    { name: 'spaced-repetition-store' }
  )
);
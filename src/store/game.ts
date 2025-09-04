import { create } from 'zustand';
import { NAMES } from '@/data/names';
import { matchesName } from '@/utils/match';
import { db } from '@/utils/db';

export interface GameResult {
  timestamp: number;
  found: number;
  durationMs: number;
  completed: boolean;
}

interface GameState {
  remainingMs: number;
  foundIds: Set<number>;
  submissions: number;
  isOver: boolean;
  input: string;
  isPlaying: boolean;
  startTime: number;
  recentMatch: number | null; // For showing feedback
  wrongInput: boolean; // For shake animation
  
  // Actions
  startGame: () => void;
  submitGuess: () => void;
  revealNow: () => void;
  tick: () => void;
  restart: () => void;
  setInput: (input: string) => void;
  clearFeedback: () => void;
}

const GAME_DURATION_MS = 13 * 60 * 1000; // 13 minutes

export const useGameStore = create<GameState>((set, get) => ({
  remainingMs: GAME_DURATION_MS,
  foundIds: new Set(),
  submissions: 0,
  isOver: false,
  input: '',
  isPlaying: false,
  startTime: 0,
  recentMatch: null,
  wrongInput: false,

  startGame: () => {
    set({
      remainingMs: GAME_DURATION_MS,
      foundIds: new Set(),
      submissions: 0,
      isOver: false,
      input: '',
      isPlaying: true,
      startTime: Date.now(),
      recentMatch: null,
      wrongInput: false,
    });
  },

  submitGuess: () => {
    const state = get();
    if (!state.isPlaying || state.isOver || !state.input.trim()) return;

    const input = state.input.trim();
    const matchedName = NAMES.find(name => 
      !state.foundIds.has(name.id) && matchesName(input, name)
    );

    if (matchedName) {
      const newFoundIds = new Set(state.foundIds);
      newFoundIds.add(matchedName.id);
      
      // Feedback will be handled by components using hooks

      set({
        foundIds: newFoundIds,
        submissions: state.submissions + 1,
        input: '',
        recentMatch: matchedName.id,
        wrongInput: false,
      });

      // Check if all names found
      if (newFoundIds.size === 99) {
        get().revealNow();
      }
    } else {
      // Wrong answer - show shake animation
      // Feedback will be handled by components using hooks
      set({
        submissions: state.submissions + 1,
        wrongInput: true,
      });
    }
  },

  revealNow: () => {
    const state = get();
    if (!state.isPlaying) return;

    const durationMs = Date.now() - state.startTime;
    const result: GameResult = {
      timestamp: Date.now(),
      found: state.foundIds.size,
      durationMs,
      completed: state.foundIds.size === 99,
    };

    // Save to IndexedDB with localStorage fallback
    db.saveGameResult(result);

    set({
      isOver: true,
      isPlaying: false,
      remainingMs: 0,
    });
  },

  tick: () => {
    const state = get();
    if (!state.isPlaying || state.isOver) return;

    const newRemainingMs = Math.max(0, state.remainingMs - 1000);
    
    if (newRemainingMs === 0) {
      get().revealNow();
    } else {
      set({ remainingMs: newRemainingMs });
    }
  },

  restart: () => {
    set({
      remainingMs: GAME_DURATION_MS,
      foundIds: new Set(),
      submissions: 0,
      isOver: false,
      input: '',
      isPlaying: false,
      startTime: 0,
      recentMatch: null,
      wrongInput: false,
    });
  },

  setInput: (input: string) => {
    set({ input });
  },

  clearFeedback: () => {
    set({ recentMatch: null, wrongInput: false });
  },
}));
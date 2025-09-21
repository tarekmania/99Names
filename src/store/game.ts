import { create } from 'zustand';
import { NAMES } from '@/data/names';
import type { DivineName } from '@/data/names';
import { matchesName } from '@/utils/match';
import { db } from '@/utils/db';
import { fetchDivineNames } from '@/services/divineNamesApi';

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
  recentMatch: number | null;
  recentFoundName: string | null;
  wrongInput: boolean;
  statusMessage: { type: 'success' | 'error' | 'warning' | null; text: string } | null;
  names: DivineName[];
  isLoading: boolean;
  
  // Actions
  loadNames: () => Promise<void>;
  startGame: () => void;
  submitGuess: () => void;
  revealNow: () => void;
  tick: () => void;
  restart: () => void;
  setInput: (input: string) => void;
  clearFeedback: () => void;
  clearStatusMessage: () => void;
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
  recentFoundName: null,
  wrongInput: false,
  statusMessage: null,
  names: [],
  isLoading: false,

  loadNames: async () => {
    set({ isLoading: true });
    try {
      const names = await fetchDivineNames();
      set({ names, isLoading: false });
    } catch (error) {
      console.error('Failed to load names:', error);
      set({ names: NAMES, isLoading: false });
    }
  },

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
      recentFoundName: null,
      wrongInput: false,
      statusMessage: null,
    });
  },

  submitGuess: () => {
    const state = get();
    if (!state.isPlaying || state.isOver || !state.input.trim()) return;

    const input = state.input.trim();
    const matchedName = state.names.find(name => 
      !state.foundIds.has(name.id) && matchesName(input, name)
    );

    if (matchedName) {
      const newFoundIds = new Set(state.foundIds);
      newFoundIds.add(matchedName.id);
      
      set({
        foundIds: newFoundIds,
        submissions: state.submissions + 1,
        input: '',
        recentMatch: matchedName.id,
        recentFoundName: matchedName.englishName,
        wrongInput: false,
        statusMessage: {
          type: 'success',
          text: `✅ Found: ${matchedName.englishName}!`
        }
      });

      // Check if all names found
      if (newFoundIds.size === state.names.length) {
        get().revealNow();
      }
    } else {
      // Check if it's a duplicate attempt
      const isDuplicate = state.names.some(name => 
        state.foundIds.has(name.id) && 
        (name.englishName.toLowerCase().includes(input.toLowerCase()) || 
         name.aliases.some(alias => alias.toLowerCase().includes(input.toLowerCase())))
      );
      
      set({
        submissions: state.submissions + 1,
        wrongInput: true,
        statusMessage: {
          type: isDuplicate ? 'warning' : 'error',
          text: isDuplicate ? '⚠️ Already found!' : '❌ Not found - try another name'
        }
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
      completed: state.foundIds.size === state.names.length,
    };

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
      recentFoundName: null,
      wrongInput: false,
      statusMessage: null,
    });
  },

  setInput: (input: string) => {
    set({ input });
  },

  clearFeedback: () => {
    set({ recentMatch: null, recentFoundName: null, wrongInput: false });
  },

  clearStatusMessage: () => {
    set({ statusMessage: null });
  },
}));
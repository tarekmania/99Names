import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { GameResult } from '@/store/game';
import { DailyResult } from '@/store/daily';

interface GameDB extends DBSchema {
  gameResults: {
    key: number;
    value: GameResult;
    indexes: { 'by-timestamp': number; 'by-found': number; };
  };
  dailyResults: {
    key: string;
    value: DailyResult;
    indexes: { 'by-date': string; };
  };
  settings: {
    key: string;
    value: any;
  };
  spacedRepetitionItems: {
    key: number;
    value: any;
    indexes: { 'by-next-review': string; };
  };
  spacedRepetitionResults: {
    key: number;
    value: any;
    indexes: { 'by-timestamp': number; };
  };
}

class DatabaseManager {
  private db: IDBPDatabase<GameDB> | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<GameDB>('99NamesMemoryDB', 3, {
        upgrade(db, oldVersion) {
          // Create game results store
          if (oldVersion < 1) {
            const resultsStore = db.createObjectStore('gameResults', {
              keyPath: 'timestamp',
            });
            resultsStore.createIndex('by-timestamp', 'timestamp');
            resultsStore.createIndex('by-found', 'found');

            // Create settings store
            db.createObjectStore('settings', {
              keyPath: 'key',
            });
          }

          // Create daily results store
          if (oldVersion < 2) {
            const dailyStore = db.createObjectStore('dailyResults', {
              keyPath: 'date',
            });
            dailyStore.createIndex('by-date', 'date');
          }

          // Create spaced repetition stores
          if (oldVersion < 3) {
            const spacedRepetitionItemsStore = db.createObjectStore('spacedRepetitionItems', {
              keyPath: 'id',
            });
            spacedRepetitionItemsStore.createIndex('by-next-review', 'nextReviewDate');

            const spacedRepetitionResultsStore = db.createObjectStore('spacedRepetitionResults', {
              keyPath: 'timestamp',
            });
            spacedRepetitionResultsStore.createIndex('by-timestamp', 'timestamp');
          }
        },
      });

      // Migrate data from localStorage if exists
      await this.migrateFromLocalStorage();
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('IndexedDB init failed, falling back to localStorage:', error);
      this.isInitialized = false;
    }
  }

  private async migrateFromLocalStorage() {
    if (!this.db) return;

    try {
      // Migrate game results
      const existingResults = localStorage.getItem('gameResults');
      if (existingResults) {
        const results: GameResult[] = JSON.parse(existingResults);
        const tx = this.db.transaction('gameResults', 'readwrite');
        
        for (const result of results) {
          await tx.store.put(result);
        }
        
        await tx.done;
        localStorage.removeItem('gameResults');
      }

      // Migrate settings
      const existingSettings = localStorage.getItem('gameSettings');
      if (existingSettings) {
        const settings = JSON.parse(existingSettings);
        const tx = this.db.transaction('settings', 'readwrite');
        
        await tx.store.put({ key: 'gameSettings', value: settings });
        await tx.done;
        localStorage.removeItem('gameSettings');
      }
    } catch (error) {
      console.warn('Migration failed:', error);
    }
  }

  async saveGameResult(result: GameResult): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        await this.db.put('gameResults', result);
        return;
      } catch (error) {
        console.warn('IndexedDB save failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const results = JSON.parse(localStorage.getItem('gameResults') || '[]');
    results.push(result);
    localStorage.setItem('gameResults', JSON.stringify(results));
  }

  async getGameResults(): Promise<GameResult[]> {
    await this.init();
    
    if (this.db) {
      try {
        return await this.db.getAllFromIndex('gameResults', 'by-timestamp');
      } catch (error) {
        console.warn('IndexedDB read failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('gameResults') || '[]');
  }

  async saveSettings(settings: any): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        await this.db.put('settings', { key: 'gameSettings', value: settings });
        return;
      } catch (error) {
        console.warn('IndexedDB settings save failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  }

  async getSettings(): Promise<any> {
    await this.init();
    
    if (this.db) {
      try {
        const result = await this.db.get('settings', 'gameSettings');
        return result?.value || null;
      } catch (error) {
        console.warn('IndexedDB settings read failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const settings = localStorage.getItem('gameSettings');
    return settings ? JSON.parse(settings) : null;
  }

  async saveDailyResult(result: DailyResult): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        await this.db.put('dailyResults', result);
        return;
      } catch (error) {
        console.warn('IndexedDB daily save failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const results = JSON.parse(localStorage.getItem('dailyResults') || '[]');
    const existingIndex = results.findIndex((r: DailyResult) => r.date === result.date);
    if (existingIndex >= 0) {
      results[existingIndex] = result;
    } else {
      results.push(result);
    }
    localStorage.setItem('dailyResults', JSON.stringify(results));
  }

  async getDailyResults(): Promise<DailyResult[]> {
    await this.init();
    
    if (this.db) {
      try {
        return await this.db.getAllFromIndex('dailyResults', 'by-date');
      } catch (error) {
        console.warn('IndexedDB daily read failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('dailyResults') || '[]');
  }

  async saveSpacedRepetitionItem(item: any): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        await this.db.put('spacedRepetitionItems', item);
        return;
      } catch (error) {
        console.warn('IndexedDB spaced repetition save failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const items = JSON.parse(localStorage.getItem('spacedRepetitionItems') || '[]');
    const existingIndex = items.findIndex((i: any) => i.id === item.id);
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem('spacedRepetitionItems', JSON.stringify(items));
  }

  async getSpacedRepetitionItems(): Promise<any[]> {
    await this.init();
    
    if (this.db) {
      try {
        return await this.db.getAll('spacedRepetitionItems');
      } catch (error) {
        console.warn('IndexedDB spaced repetition read failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('spacedRepetitionItems') || '[]');
  }

  async saveSpacedRepetitionResult(result: any): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        await this.db.put('spacedRepetitionResults', result);
        return;
      } catch (error) {
        console.warn('IndexedDB spaced repetition result save failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const results = JSON.parse(localStorage.getItem('spacedRepetitionResults') || '[]');
    results.push(result);
    localStorage.setItem('spacedRepetitionResults', JSON.stringify(results));
  }

  async getSpacedRepetitionResults(): Promise<any[]> {
    await this.init();
    
    if (this.db) {
      try {
        return await this.db.getAllFromIndex('spacedRepetitionResults', 'by-timestamp');
      } catch (error) {
        console.warn('IndexedDB spaced repetition results read failed, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('spacedRepetitionResults') || '[]');
  }

  async clearAllData(): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        const tx = this.db.transaction(['gameResults', 'dailyResults', 'settings', 'spacedRepetitionItems', 'spacedRepetitionResults'], 'readwrite');
        await Promise.all([
          tx.objectStore('gameResults').clear(),
          tx.objectStore('dailyResults').clear(),
          tx.objectStore('settings').clear(),
          tx.objectStore('spacedRepetitionItems').clear(),
          tx.objectStore('spacedRepetitionResults').clear(),
        ]);
        await tx.done;
        return;
      } catch (error) {
        console.warn('IndexedDB clear failed, clearing localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    localStorage.removeItem('gameResults');
    localStorage.removeItem('dailyResults');
    localStorage.removeItem('gameSettings');
    localStorage.removeItem('spacedRepetitionItems');
    localStorage.removeItem('spacedRepetitionResults');
  }
}

export const db = new DatabaseManager();
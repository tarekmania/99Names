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
}

class DatabaseManager {
  private db: IDBPDatabase<GameDB> | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<GameDB>('99NamesMemoryDB', 2, {
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

  async clearAllData(): Promise<void> {
    await this.init();
    
    if (this.db) {
      try {
        const tx = this.db.transaction(['gameResults', 'dailyResults', 'settings'], 'readwrite');
        await Promise.all([
          tx.objectStore('gameResults').clear(),
          tx.objectStore('dailyResults').clear(),
          tx.objectStore('settings').clear(),
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
  }
}

export const db = new DatabaseManager();
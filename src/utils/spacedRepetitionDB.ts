import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface SpacedRepetitionItem {
  nameId: number;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: Date;
  lastReview: Date | null;
  stage: 'new' | 'learning' | 'young' | 'mature';
  consecutiveCorrect: number; // Add for backward compatibility
}

interface SpacedRepetitionDB extends DBSchema {
  spacedRepetition: {
    key: number;
    value: SpacedRepetitionItem;
    indexes: { 'by-nameId': number };
  };
}

class SpacedRepetitionDBManager {
  private db: IDBPDatabase<SpacedRepetitionDB> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      this.db = await openDB<SpacedRepetitionDB>('SpacedRepetitionDB', 1, {
        upgrade(db) {
          const store = db.createObjectStore('spacedRepetition', {
            keyPath: 'nameId',
          });
          store.createIndex('by-nameId', 'nameId');
        },
      });
      this.isInitialized = true;
    } catch (error) {
      console.warn('SpacedRepetition IndexedDB init failed:', error);
      this.isInitialized = false;
      this.db = null;
    }
  }

  async saveItems(items: SpacedRepetitionItem[]): Promise<void> {
    await this.init();
    
    if (!this.db) {
      console.warn('Database not available, skipping save');
      return;
    }

    try {
      const tx = this.db.transaction('spacedRepetition', 'readwrite');
      const promises = items.map(item => tx.store.put(item));
      await Promise.all([...promises, tx.done]);
    } catch (error) {
      console.warn('Failed to save spaced repetition items:', error);
    }
  }

  async loadItems(): Promise<SpacedRepetitionItem[]> {
    await this.init();
    
    if (!this.db) {
      console.warn('Database not available, returning empty array');
      return [];
    }

    try {
      return await this.db.getAll('spacedRepetition');
    } catch (error) {
      console.warn('Failed to load spaced repetition items:', error);
      return [];
    }
  }

  async getItem(nameId: number): Promise<SpacedRepetitionItem | undefined> {
    await this.init();
    
    if (!this.db) return undefined;

    try {
      return await this.db.get('spacedRepetition', nameId);
    } catch (error) {
      console.warn('Failed to get spaced repetition item:', error);
      return undefined;
    }
  }

  async clearAll(): Promise<void> {
    await this.init();
    
    if (!this.db) return;

    try {
      await this.db.clear('spacedRepetition');
    } catch (error) {
      console.warn('Failed to clear spaced repetition items:', error);
    }
  }
}

export const spacedRepetitionDB = new SpacedRepetitionDBManager();
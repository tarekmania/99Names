import { supabase } from '@/integrations/supabase/client';
import { db } from '@/utils/db';

export interface MigrationResult {
  success: boolean;
  gameResults: number;
  dailyResults: number;
  spacedRepetitionItems: number;
  errors: string[];
}

/**
 * Migrates existing local data to Supabase cloud storage
 * This should be called when a user first logs in to sync their existing progress
 */
export async function migrateLocalDataToCloud(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    gameResults: 0,
    dailyResults: 0,
    spacedRepetitionItems: 0,
    errors: []
  };

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      result.errors.push('User not authenticated');
      return result;
    }

    // Migrate game results
    try {
      const localGameResults = await db.getGameResults();
      if (localGameResults.length > 0) {
        const gameResultsToInsert = localGameResults.map(result => ({
          user_id: user.id,
          timestamp: result.timestamp,
          found_count: result.found,
          duration_ms: result.durationMs,
          completed: result.completed,
        }));

        const { error: gameError } = await supabase
          .from('game_results')
          .insert(gameResultsToInsert);

        if (gameError) {
          result.errors.push(`Game results migration failed: ${gameError.message}`);
        } else {
          result.gameResults = localGameResults.length;
        }
      }
    } catch (error) {
      result.errors.push(`Game results migration error: ${error}`);
    }

    // Migrate daily results
    try {
      const localDailyResults = await db.getDailyResults();
      if (localDailyResults.length > 0) {
        const dailyResultsToInsert = localDailyResults.map(result => ({
          user_id: user.id,
          date: result.date,
          completed: result.completed,
          streak_count: 0, // Will be recalculated
          found_names: result.names.map(id => id.toString()),
        }));

        const { error: dailyError } = await supabase
          .from('daily_results')
          .insert(dailyResultsToInsert);

        if (dailyError) {
          result.errors.push(`Daily results migration failed: ${dailyError.message}`);
        } else {
          result.dailyResults = localDailyResults.length;
        }
      }
    } catch (error) {
      result.errors.push(`Daily results migration error: ${error}`);
    }

    // Migrate spaced repetition items
    try {
      // Load from IndexedDB
      const { openDB } = await import('idb');
      const spacedRepDB = await openDB('SpacedRepetitionDB', 1);
      const localSpacedRepItems = await spacedRepDB.getAll('items');

      if (localSpacedRepItems.length > 0) {
        const spacedRepItemsToInsert = localSpacedRepItems.map(item => ({
          user_id: user.id,
          name_id: item.nameId,
          interval_days: item.interval,
          ease_factor: item.easeFactor,
          consecutive_correct: item.consecutiveCorrect,
          last_reviewed: item.lastReviewed ? new Date(item.lastReviewed).toISOString() : null,
          next_review: new Date(item.nextReview).toISOString(),
        }));

        const { error: spacedRepError } = await supabase
          .from('spaced_repetition_items')
          .insert(spacedRepItemsToInsert);

        if (spacedRepError) {
          result.errors.push(`Spaced repetition migration failed: ${spacedRepError.message}`);
        } else {
          result.spacedRepetitionItems = localSpacedRepItems.length;
        }
      }
    } catch (error) {
      result.errors.push(`Spaced repetition migration error: ${error}`);
    }

    // Migrate settings
    try {
      const localSettings = await db.getSettings();
      if (localSettings) {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            settings_json: localSettings,
          });

        if (settingsError) {
          result.errors.push(`Settings migration failed: ${settingsError.message}`);
        }
      }
    } catch (error) {
      result.errors.push(`Settings migration error: ${error}`);
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`Migration failed: ${error}`);
    return result;
  }
}

/**
 * Syncs cloud data to local storage
 * This should be called when a user logs in on a new device
 */
export async function syncCloudDataToLocal(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    gameResults: 0,
    dailyResults: 0,
    spacedRepetitionItems: 0,
    errors: []
  };

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      result.errors.push('User not authenticated');
      return result;
    }

    // Sync game results
    try {
      const { data: cloudGameResults, error: gameError } = await supabase
        .from('game_results')
        .select('*')
        .eq('user_id', user.id);

      if (gameError) {
        result.errors.push(`Failed to fetch game results: ${gameError.message}`);
      } else if (cloudGameResults) {
        for (const cloudResult of cloudGameResults) {
          await db.saveGameResult({
            timestamp: cloudResult.timestamp,
            found: cloudResult.found_count,
            durationMs: cloudResult.duration_ms,
            completed: cloudResult.completed,
          });
        }
        result.gameResults = cloudGameResults.length;
      }
    } catch (error) {
      result.errors.push(`Game results sync error: ${error}`);
    }

    // Sync daily results
    try {
      const { data: cloudDailyResults, error: dailyError } = await supabase
        .from('daily_results')
        .select('*')
        .eq('user_id', user.id);

      if (dailyError) {
        result.errors.push(`Failed to fetch daily results: ${dailyError.message}`);
      } else if (cloudDailyResults) {
        for (const cloudResult of cloudDailyResults) {
          await db.saveDailyResult({
            date: cloudResult.date,
            found: cloudResult.found_names?.length || 0,
            total: 15, // Default daily challenge size
            duration: 0, // Not stored in cloud
            completed: cloudResult.completed,
            names: cloudResult.found_names?.map(id => parseInt(id)) || [],
          });
        }
        result.dailyResults = cloudDailyResults.length;
      }
    } catch (error) {
      result.errors.push(`Daily results sync error: ${error}`);
    }

    // Sync spaced repetition items
    try {
      const { data: cloudSpacedRepItems, error: spacedRepError } = await supabase
        .from('spaced_repetition_items')
        .select('*')
        .eq('user_id', user.id);

      if (spacedRepError) {
        result.errors.push(`Failed to fetch spaced repetition items: ${spacedRepError.message}`);
      } else if (cloudSpacedRepItems) {
        // Save to IndexedDB
        const { openDB } = await import('idb');
        const spacedRepDB = await openDB('SpacedRepetitionDB', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('items')) {
              db.createObjectStore('items', { keyPath: 'nameId' });
            }
          },
        });

        const tx = spacedRepDB.transaction('items', 'readwrite');
        for (const cloudItem of cloudSpacedRepItems) {
          await tx.store.put({
            nameId: cloudItem.name_id,
            interval: cloudItem.interval_days,
            easeFactor: cloudItem.ease_factor,
            consecutiveCorrect: cloudItem.consecutive_correct,
            lastReviewed: cloudItem.last_reviewed ? new Date(cloudItem.last_reviewed) : new Date(0),
            nextReview: new Date(cloudItem.next_review),
          });
        }
        await tx.done;
        result.spacedRepetitionItems = cloudSpacedRepItems.length;
      }
    } catch (error) {
      result.errors.push(`Spaced repetition sync error: ${error}`);
    }

    // Sync settings
    try {
      const { data: cloudSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        result.errors.push(`Failed to fetch settings: ${settingsError.message}`);
      } else if (cloudSettings) {
        await db.saveSettings(cloudSettings.settings_json);
      }
    } catch (error) {
      result.errors.push(`Settings sync error: ${error}`);
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`Sync failed: ${error}`);
    return result;
  }
}

/**
 * Checks if the user has any cloud data
 */
export async function hasCloudData(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const [gameResults, dailyResults, spacedRepItems] = await Promise.all([
      supabase.from('game_results').select('id').eq('user_id', user.id).limit(1),
      supabase.from('daily_results').select('id').eq('user_id', user.id).limit(1),
      supabase.from('spaced_repetition_items').select('id').eq('user_id', user.id).limit(1),
    ]);

    return (
      (gameResults.data && gameResults.data.length > 0) ||
      (dailyResults.data && dailyResults.data.length > 0) ||
      (spacedRepItems.data && spacedRepItems.data.length > 0)
    );
  } catch (error) {
    console.error('Error checking cloud data:', error);
    return false;
  }
}

/**
 * Checks if the user has any local data
 */
export async function hasLocalData(): Promise<boolean> {
  try {
    const [gameResults, dailyResults] = await Promise.all([
      db.getGameResults(),
      db.getDailyResults(),
    ]);

    // Check spaced repetition data
    let hasSpacedRepData = false;
    try {
      const { openDB } = await import('idb');
      const spacedRepDB = await openDB('SpacedRepetitionDB', 1);
      const spacedRepItems = await spacedRepDB.getAll('items');
      hasSpacedRepData = spacedRepItems.length > 0;
    } catch (error) {
      // IndexedDB might not exist yet
    }

    return gameResults.length > 0 || dailyResults.length > 0 || hasSpacedRepData;
  } catch (error) {
    console.error('Error checking local data:', error);
    return false;
  }
}

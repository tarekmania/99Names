import type { DivineName } from '../data/names';

interface ApiName {
  name: string; // Arabic text
  transliteration: string;
  number: number;
  en: {
    meaning: string;
  };
}

interface ApiResponse {
  code: number;
  status: string;
  data: ApiName[];
}

export async function fetchDivineNames(): Promise<DivineName[]> {
  try {
    // Load static data for aliases
    const { NAMES: staticNames } = await import('../data/names');
    
    const response = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (result.code !== 200 || !result.data || result.data.length !== 99) {
      throw new Error('API returned invalid data');
    }
    
    // Merge API data with static aliases - both have 99 names in same order
    return result.data.map((apiName): DivineName => {
      const staticName = staticNames.find(name => name.id === apiName.number);
      
      return {
        id: apiName.number,
        arabic: apiName.name, // Use authentic Arabic from API
        englishName: apiName.transliteration,
        meanings: apiName.en.meaning, // Use API meanings
        aliases: staticName?.aliases || [] // Preserve our comprehensive aliases
      };
    });
    
  } catch (error) {
    console.error('Failed to fetch divine names from API:', error);
    
    // Fallback to our static data with full aliases if API fails
    const { NAMES } = await import('../data/names');
    return NAMES;
  }
}
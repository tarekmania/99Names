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
    const response = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (result.code !== 200 || !result.data) {
      throw new Error('API returned invalid data');
    }
    
    // Transform API data to match our DivineName interface
    return result.data.map((apiName): DivineName => ({
      id: apiName.number,
      arabic: apiName.name,
      englishName: apiName.transliteration,
      meanings: apiName.en.meaning,
      aliases: [] // API doesn't provide aliases, so we use empty array
    }));
    
  } catch (error) {
    console.error('Failed to fetch divine names from API:', error);
    
    // Fallback to our static data if API fails
    const { NAMES } = await import('../data/names');
    return NAMES;
  }
}
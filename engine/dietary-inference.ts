import dictionary from '@/assets/names-dictionary.json';
import type { DietaryPreference } from '@/types/booking';

const DB = dictionary as Record<string, string>;

// Priority order when multiple name tokens match different preferences
const PRIORITY: DietaryPreference[] = ['halal', 'kosher', 'vegetarian', 'vegan'];

export interface DietaryInference {
  preference: DietaryPreference;
  confidence: 'high' | 'medium';
}

export function inferDietary(fullName: string): DietaryInference | null {
  if (!fullName?.trim()) return null;

  const tokens = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const hits: DietaryPreference[] = [];
  for (const token of tokens) {
    const match = DB[token] as DietaryPreference | undefined;
    if (match) hits.push(match);
  }

  if (hits.length === 0) return null;

  // Pick highest-priority hit
  for (const pref of PRIORITY) {
    if (hits.includes(pref)) {
      return {
        preference: pref,
        confidence: hits.length >= 2 ? 'high' : 'medium',
      };
    }
  }

  return { preference: hits[0], confidence: 'medium' };
}

export function dietaryLabel(pref: DietaryPreference): string {
  switch (pref) {
    case 'halal':       return 'Halal';
    case 'vegetarian':  return 'Vegetarian';
    case 'kosher':      return 'Kosher';
    case 'vegan':       return 'Vegan';
    case 'none':        return 'No preference';
  }
}

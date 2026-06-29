import { inferDietary, dietaryLabel } from '@/engine/dietary-inference';

describe('inferDietary', () => {
  it('returns null for empty name', () => {
    expect(inferDietary('')).toBeNull();
    expect(inferDietary('   ')).toBeNull();
  });

  it('infers halal for a Muslim name', () => {
    const result = inferDietary('Muhammad Ali');
    expect(result?.preference).toBe('halal');
  });

  it('infers vegetarian for a Hindu surname', () => {
    const result = inferDietary('Priya Sharma');
    expect(result?.preference).toBe('vegetarian');
  });

  it('infers kosher for a Jewish surname', () => {
    const result = inferDietary('David Cohen');
    expect(result?.preference).toBe('kosher');
  });

  it('returns high confidence when both tokens match', () => {
    const result = inferDietary('Muhammad Hassan');
    expect(result?.confidence).toBe('high');
  });

  it('returns medium confidence for a single token match', () => {
    const result = inferDietary('Muhammad Smith');
    expect(result?.confidence).toBe('medium');
  });

  it('halal takes priority over vegetarian', () => {
    // A name that matches both should return halal
    const result = inferDietary('Muhammad Sharma');
    expect(result?.preference).toBe('halal');
  });

  it('returns null for a name with no dictionary match', () => {
    expect(inferDietary('John Smith')).toBeNull();
  });

  it('is case-insensitive', () => {
    const lower = inferDietary('muhammad ali');
    const upper = inferDietary('MUHAMMAD ALI');
    expect(lower?.preference).toBe(upper?.preference);
  });
});

describe('dietaryLabel', () => {
  it('returns readable labels for all preferences', () => {
    expect(dietaryLabel('halal')).toBe('Halal');
    expect(dietaryLabel('vegetarian')).toBe('Vegetarian');
    expect(dietaryLabel('kosher')).toBe('Kosher');
    expect(dietaryLabel('vegan')).toBe('Vegan');
    expect(dietaryLabel('none')).toBe('No preference');
  });
});

import { PassengerType } from '@/store/booking.store';

// Age brackets used at search time (store/search.store.ts PassengerCounts):
// adults 12+, children 2–11, infants under 2.
const CHILD_MIN_AGE = 2;
const ADULT_MIN_AGE = 12;

// Age in whole years at a reference date (e.g. departure) — DOB and reference
// are both YYYY-MM-DD or full ISO strings; only the date portion is used.
export function ageAt(dobIso: string, referenceIso: string): number {
  const d = new Date(dobIso);
  const r = new Date(referenceIso);
  let age = r.getFullYear() - d.getFullYear();
  const monthDiff = r.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && r.getDate() < d.getDate())) age--;
  return age;
}

export function expectedTypeForAge(age: number): PassengerType {
  if (age < CHILD_MIN_AGE) return 'infant_without_seat';
  if (age < ADULT_MIN_AGE) return 'child';
  return 'adult';
}

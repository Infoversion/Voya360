import { create } from 'zustand';
import { DuffelOffer } from '@/types/duffel';
import { CabinClass } from '@/types/booking';
import { searchFlights, suggestPlaces } from '@/lib/duffel';
import { sortByTotalCost } from '@/engine/total-cost';

export interface AirportOption {
  iata:     string;
  name:     string;
  city:     string;
  country:  string;
}

export interface PassengerCounts {
  adults:   number; // 12+
  children: number; // 2–11
  infants:  number; // under 2, lap-seated
}

export type SortMode      = 'total' | 'duration' | 'departure';
export type SortDirection = 'asc' | 'desc';

interface SearchState {
  origin:          AirportOption | null;
  destination:     AirportOption | null;
  departureDate:   string | null;
  returnDate:      string | null;
  passengerCounts: PassengerCounts;
  cabinClass:      CabinClass;
  isRoundTrip:     boolean;

  offers:         DuffelOffer[] | null;
  sortedOffers:   DuffelOffer[] | null;
  offerRequestId: string | null;
  isSearching:    boolean;
  searchError:    string | null;
  sortMode:       SortMode;
  sortDirection:  SortDirection;
  bagCount:       number;

  setOrigin:            (place: AirportOption | null) => void;
  setDestination:       (place: AirportOption | null) => void;
  swapAirports:         () => void;
  setDepartureDate:     (date: string) => void;
  setReturnDate:        (date: string | null) => void;
  setPassengerCounts:   (counts: Partial<PassengerCounts>) => void;
  setCabinClass:        (cls: CabinClass) => void;
  setIsRoundTrip:       (rt: boolean) => void;
  setSortMode:          (mode: SortMode) => void;
  setBagCount:          (n: number) => void;
  search:               () => Promise<void>;
  clearResults:         () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  origin:          null,
  destination:     null,
  departureDate:   null,
  returnDate:      null,
  passengerCounts: { adults: 1, children: 0, infants: 0 },
  cabinClass:      'economy',
  isRoundTrip:     false,

  offers:         null,
  sortedOffers:   null,
  offerRequestId: null,
  isSearching:    false,
  searchError:    null,
  sortMode:       'total',
  sortDirection:  'asc',
  bagCount:       2,

  setOrigin:      (place) => set({ origin: place }),
  setDestination: (place) => set({ destination: place }),

  swapAirports: () => {
    const { origin, destination } = get();
    set({ origin: destination, destination: origin });
  },

  setDepartureDate: (date) => set({ departureDate: date }),
  setReturnDate:    (date) => set({ returnDate: date }),

  setPassengerCounts: (counts) => {
    const prev = get().passengerCounts;
    const next = { ...prev, ...counts };
    // Infants can't exceed adults (lap-seated)
    next.infants = Math.min(next.infants, next.adults);
    // Totals capped at 9 (airline limits)
    const total = next.adults + next.children + next.infants;
    if (total > 9) return; // reject if would exceed
    set({ passengerCounts: next });
  },

  setCabinClass:  (cls) => set({ cabinClass: cls }),
  setIsRoundTrip: (rt) => set({ isRoundTrip: rt, returnDate: rt ? get().returnDate : null }),

  setSortMode: (mode) => {
    const { offers, bagCount, sortMode, sortDirection } = get();
    if (!offers) return;
    // Tapping the active chip toggles direction; tapping a new chip resets to asc
    const newDirection: SortDirection = mode === sortMode
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc';
    set({
      sortMode:      mode,
      sortDirection: newDirection,
      sortedOffers:  applySort(offers, mode, newDirection, bagCount),
    });
  },

  setBagCount: (n) => {
    const { offers, sortMode, sortDirection } = get();
    set({ bagCount: n });
    if (offers) set({ sortedOffers: applySort(offers, sortMode, sortDirection, n) });
  },

  search: async () => {
    const { origin, destination, departureDate, returnDate, isRoundTrip, passengerCounts, cabinClass, bagCount } = get();
    if (!origin || !destination || !departureDate) return;
    if (isRoundTrip && !returnDate) return;

    set({ isSearching: true, searchError: null, offers: null, sortedOffers: null, sortMode: 'total', sortDirection: 'asc' });

    // Build the typed passenger array for Duffel
    const passengerArray = [
      ...Array(passengerCounts.adults).fill({ type: 'adult' as const }),
      ...Array(passengerCounts.children).fill({ type: 'child' as const }),
      ...Array(passengerCounts.infants).fill({ type: 'infant_without_seat' as const }),
    ];

    try {
      const result = await searchFlights({
        origin:        origin.iata,
        destination:   destination.iata,
        departureDate,
        returnDate:    isRoundTrip ? returnDate ?? undefined : undefined,
        isRoundTrip,
        passengers:    passengerArray,
        cabinClass,
      });

      const sorted = applySort(result.offers, 'total', 'asc', bagCount);
      set({
        isSearching:    false,
        offers:         result.offers,
        sortedOffers:   sorted,
        offerRequestId: result.offerRequestId,
      });
    } catch (err) {
      set({
        isSearching: false,
        searchError: err instanceof Error ? err.message : 'Search failed',
      });
    }
  },

  clearResults: () => set({
    offers: null, sortedOffers: null, offerRequestId: null,
    searchError: null,
  }),
}));

function applySort(offers: DuffelOffer[], mode: SortMode, direction: SortDirection, bagCount: number): DuffelOffer[] {
  let sorted: DuffelOffer[];

  if (mode === 'total') {
    sorted = sortByTotalCost(offers, bagCount);
  } else if (mode === 'duration') {
    sorted = [...offers].sort((a, b) => {
      const durA = a.slices.reduce((s, sl) => s + parseDurationMinutes(sl.duration), 0);
      const durB = b.slices.reduce((s, sl) => s + parseDurationMinutes(sl.duration), 0);
      return durA - durB;
    });
  } else {
    sorted = [...offers].sort((a, b) => {
      const tA = a.slices[0]?.segments[0]?.departing_at ?? '';
      const tB = b.slices[0]?.segments[0]?.departing_at ?? '';
      return tA < tB ? -1 : tA > tB ? 1 : 0;
    });
  }

  return direction === 'desc' ? [...sorted].reverse() : sorted;
}

function parseDurationMinutes(iso: string | undefined): number {
  if (!iso) return 0;
  const days  = iso.match(/(\d+)D/);
  const hours = iso.match(/(\d+)H/);
  const mins  = iso.match(/(\d+)M/);
  return (parseInt(days?.[1] ?? '0') * 1440)
       + (parseInt(hours?.[1] ?? '0') * 60)
       + (parseInt(mins?.[1]  ?? '0'));
}

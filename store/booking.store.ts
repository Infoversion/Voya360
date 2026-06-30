import { create } from 'zustand';
import { DuffelOffer, DuffelOfferPassenger } from '@/types/duffel';
import { DietaryPreference, SeatPreference } from '@/types/booking';

export type PassengerType = DuffelOfferPassenger['type'];

export interface PassengerInput {
  id:              string; // local uuid
  type:            PassengerType;
  savedTravelerId: string | null;
  givenName:       string;
  familyName:      string;
  dateOfBirth:     string;
  passportNumber:  string;
  passportCountry: string;
  passportExpiry:  string;
  gender:          'm' | 'f' | '';
  email:           string;
  phone:           string;
  dietary:         DietaryPreference | '';
}

function blankPassenger(id: string, type: PassengerType = 'adult'): PassengerInput {
  return {
    id, type, savedTravelerId: null,
    givenName: '', familyName: '',
    dateOfBirth: '', passportNumber: '',
    passportCountry: '', passportExpiry: '',
    gender: '', email: '', phone: '', dietary: '',
  };
}

// key: `${segmentId}__${passengerId}` → Duffel seat service id
export type SelectedSeats = Record<string, string>;

interface BookingState {
  selectedOffer:    DuffelOffer | null;
  passengers:       PassengerInput[];
  paymentIntentId:  string | null;
  clientToken:      string | null;
  duffelOrderId:    string | null;
  pnr:              string | null;
  isCreatingIntent: boolean;
  isConfirming:     boolean;
  error:            string | null;
  selectedSeats:    SelectedSeats;
  selectedServices: Array<{ id: string; quantity: number }>;

  setOffer:            (offer: DuffelOffer) => void;
  initPassengers:      (count: number) => void;
  updatePassenger:     (id: string, updates: Partial<PassengerInput>) => void;
  setPaymentIntent:    (id: string, token: string) => void;
  setConfirmed:        (orderId: string, pnr: string) => void;
  setCreatingIntent:   (v: boolean) => void;
  setConfirming:       (v: boolean) => void;
  setError:            (msg: string | null) => void;
  setSeat:             (segmentId: string, passengerId: string, serviceId: string | null) => void;
  setSelectedServices: (services: Array<{ id: string; quantity: number }>) => void;
  reset:               () => void;
}

let _pid = 0;
function uid() { return `p_${++_pid}`; }

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedOffer:    null,
  passengers:       [],
  paymentIntentId:  null,
  clientToken:      null,
  duffelOrderId:    null,
  pnr:              null,
  isCreatingIntent: false,
  isConfirming:     false,
  error:            null,
  selectedSeats:    {},
  selectedServices: [],

  setOffer: (offer) => {
    const { passengers } = get();
    // Build one PassengerInput per Duffel passenger, preserving type (adult/child/infant)
    const next = (offer.passengers ?? []).map((offerPax, i) => {
      const existing = passengers[i];
      if (existing) return { ...existing, type: offerPax.type };
      return blankPassenger(uid(), offerPax.type);
    });
    set({ selectedOffer: offer, passengers: next.length ? next : [blankPassenger(uid())] });
  },

  initPassengers: (count) => {
    set({ passengers: Array.from({ length: count }, () => blankPassenger(uid())) });
  },

  updatePassenger: (id, updates) => {
    set(s => ({
      passengers: s.passengers.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  },

  setPaymentIntent: (id, token) => set({ paymentIntentId: id, clientToken: token }),
  setConfirmed:     (orderId, pnr) => set({ duffelOrderId: orderId, pnr }),
  setCreatingIntent: (v) => set({ isCreatingIntent: v }),
  setConfirming:    (v) => set({ isConfirming: v }),
  setError:         (msg) => set({ error: msg }),

  setSeat: (segmentId, passengerId, serviceId) => set(s => {
    const key = `${segmentId}__${passengerId}`;
    const next = { ...s.selectedSeats };
    if (serviceId) next[key] = serviceId; else delete next[key];
    return { selectedSeats: next };
  }),

  setSelectedServices: (services) => set({ selectedServices: services }),

  reset: () => set({
    selectedOffer: null, passengers: [], paymentIntentId: null,
    clientToken: null, duffelOrderId: null, pnr: null,
    isCreatingIntent: false, isConfirming: false, error: null,
    selectedSeats: {}, selectedServices: [],
  }),
}));

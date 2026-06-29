import { create } from 'zustand';
import { VoyaObservation, VoyaScreen } from '@/types/voya';

interface VoyaState {
  observations:  VoyaObservation[];
  initialized:   boolean;
  initializing:  boolean;

  setObservations:  (obs: VoyaObservation[]) => void;
  dismiss:          (id: string) => void;
  forScreen:        (screen: VoyaScreen) => VoyaObservation | null;
  setInitializing:  (v: boolean) => void;
}

export const useVoyaStore = create<VoyaState>((set, get) => ({
  observations:  [],
  initialized:   false,
  initializing:  false,

  setObservations: (obs) => set({ observations: obs, initialized: true }),

  dismiss: (id) => set(s => ({
    observations: s.observations.map(o => o.id === id ? { ...o, dismissed: true } : o),
  })),

  // Returns the highest-priority non-dismissed observation for the given screen.
  forScreen: (screen) => {
    const { observations } = get();
    return observations
      .filter(o => o.screen === screen && !o.dismissed)
      .sort((a, b) => a.priority - b.priority)[0] ?? null;
  },

  setInitializing: (v) => set({ initializing: v }),
}));

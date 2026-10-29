import { create } from 'zustand';
import { VoyaObservation, VoyaScreen } from '@/types/voya';

interface VoyaState {
  observations:   VoyaObservation[];
  dismissHistory: string[];
  initialized:    boolean;
  initializing:   boolean;

  setObservations:         (obs: VoyaObservation[]) => void;
  mergeSearchObservations: (obs: VoyaObservation[]) => void;
  dismiss:                 (id: string) => void;
  goBack:                  (screen: VoyaScreen, currentId: string) => void;
  forScreen:               (screen: VoyaScreen) => VoyaObservation | null;
  hasPreviousForScreen:    (screen: VoyaScreen, currentId: string) => boolean;
  setInitializing:         (v: boolean) => void;
}

export const useVoyaStore = create<VoyaState>((set, get) => ({
  observations:   [],
  dismissHistory: [],
  initialized:    false,
  initializing:   false,

  setObservations: (obs) => set({ observations: obs, initialized: true }),

  // Replaces all results-screen observations with search-specific ones.
  // Called after each search so Voya reflects the actual route + date searched.
  mergeSearchObservations: (obs) => set(s => ({
    observations: [
      ...s.observations.filter(o => o.screen !== 'results'),
      ...obs,
    ],
  })),

  dismiss: (id) => set(s => ({
    observations: s.observations.map(o => o.id === id ? { ...o, dismissed: true } : o),
    dismissHistory: [...s.dismissHistory, id],
  })),

  // Atomically dismisses the current card and restores the last dismissed card
  // for the same screen. Both changes land in one Zustand set to avoid flicker.
  goBack: (screen, currentId) => set(s => {
    const screenIds = new Set(s.observations.filter(o => o.screen === screen).map(o => o.id));
    let restoreId: string | null = null;
    let restoreIdx = -1;
    for (let i = s.dismissHistory.length - 1; i >= 0; i--) {
      const id = s.dismissHistory[i];
      if (screenIds.has(id) && id !== currentId) {
        restoreId = id;
        restoreIdx = i;
        break;
      }
    }
    if (restoreId === null) return {};
    return {
      observations: s.observations.map(o => {
        if (o.id === currentId) return { ...o, dismissed: true };
        if (o.id === restoreId) return { ...o, dismissed: false };
        return o;
      }),
      dismissHistory: [
        ...s.dismissHistory.filter((_, i) => i !== restoreIdx),
        currentId,
      ],
    };
  }),

  forScreen: (screen) => {
    const { observations } = get();
    return observations
      .filter(o => o.screen === screen && !o.dismissed)
      .sort((a, b) => a.priority - b.priority)[0] ?? null;
  },

  hasPreviousForScreen: (screen, currentId) => {
    const { observations, dismissHistory } = get();
    const screenIds = new Set(observations.filter(o => o.screen === screen).map(o => o.id));
    return dismissHistory.some(id => screenIds.has(id) && id !== currentId);
  },

  setInitializing: (v) => set({ initializing: v }),
}));

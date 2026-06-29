import { useVoyaStore } from '@/store/voya.store';
import type { VoyaScreen } from '@/types/voya';

export function useVoya(screen: VoyaScreen) {
  const { forScreen, dismiss } = useVoyaStore();
  const observation = forScreen(screen);
  return { observation, dismiss };
}

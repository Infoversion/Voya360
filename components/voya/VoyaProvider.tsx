import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { useVoyaStore } from '@/store/voya.store';
import { VoyaObservation, VoyaObservationType, VOYA_SCREEN_MAP } from '@/types/voya';
import { getActiveEvents } from '@/engine/seasonal-events';

let _idCounter = 0;
function nextId() { return `voya_${++_idCounter}`; }

export function VoyaProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuthStore();
  const { initialized, initializing, setObservations, setInitializing } = useVoyaStore();
  const calledRef = useRef(false);

  useEffect(() => {
    if (!session || initialized || initializing || calledRef.current) return;
    calledRef.current = true;
    init();
  }, [session, profile]);

  const init = async () => {
    setInitializing(true);
    try {
      // Compute upcoming seasonal events for the user's destination — deduplicated by name.
      // Only future or currently-active events within 90 days are included.
      const rawEvents = profile?.home_destination
        ? getActiveEvents(profile.home_destination, new Date(), 90)
        : [];
      const seen = new Set<string>();
      const upcomingEvents = rawEvents.filter(e => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
      });

      const { data, error } = await supabase.functions.invoke('voya-init', {
        body: {
          homeOrigin:        profile?.home_origin      ?? null,
          homeDestination:   profile?.home_destination ?? null,
          preferredAirlines: profile?.preferred_airlines ?? [],
          savedTravelerCount: 0,
          dietaryPreference: profile?.dietary_preference ?? null,
          upcomingEvents,
        },
      });

      if (error || !data?.observations) return;

      const observations: VoyaObservation[] = (data.observations as Array<{
        type:     VoyaObservationType;
        headline: string;
        body:     string;
        priority: number;
      }>).map(o => ({
        id:        nextId(),
        type:      o.type,
        headline:  o.headline,
        body:      o.body,
        screen:    VOYA_SCREEN_MAP[o.type],
        priority:  o.priority,
        dismissed: false,
      }));

      setObservations(observations);
    } catch {
      // Voya is always additive — silently fail, never block the user
    } finally {
      setInitializing(false);
    }
  };

  return <>{children}</>;
}

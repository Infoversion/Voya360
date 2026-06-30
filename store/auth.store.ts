import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/booking';
import { useSearchStore } from '@/store/search.store';

interface AuthState {
  session:            Session | null;
  profile:            UserProfile | null;
  isLoading:          boolean;
  error:              string | null;
  emailConfirmPending: boolean;
  setSession:         (session: Session | null) => void;
  loadProfile:        () => Promise<void>;
  signIn:             (email: string, password: string) => Promise<void>;
  signUp:             (email: string, password: string, fullName: string) => Promise<void>;
  signOut:            () => Promise<void>;
  updateProfile:      (updates: Partial<UserProfile>) => Promise<void>;
  clearError:         () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:             null,
  profile:             null,
  isLoading:           false,
  error:               null,
  emailConfirmPending: false,

  setSession: (session) => set({ session }),

  loadProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) {
      set({ profile: data as UserProfile });
      const bagCount = (data as UserProfile).default_bag_count;
      if (bagCount != null) useSearchStore.getState().setBagCount(bagCount);
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({ isLoading: false });
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true, error: null, emailConfirmPending: false });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    // No session = email confirmation required; trigger already created the user row
    if (data.user && !data.session) {
      set({ isLoading: false, emailConfirmPending: true });
      return;
    }
    set({ isLoading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (!error && data) {
      set({ profile: data as UserProfile });
      const bagCount = (data as UserProfile).default_bag_count;
      if (bagCount != null) useSearchStore.getState().setBagCount(bagCount);
    }
  },

  clearError: () => set({ error: null }),
}));

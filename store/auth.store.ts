import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/booking';

interface AuthState {
  session:       Session | null;
  profile:       UserProfile | null;
  isLoading:     boolean;
  error:         string | null;
  setSession:    (session: Session | null) => void;
  loadProfile:   () => Promise<void>;
  signIn:        (email: string, password: string) => Promise<void>;
  signUp:        (email: string, password: string, fullName: string) => Promise<void>;
  signOut:       () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError:    () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:   null,
  profile:   null,
  isLoading: false,
  error:     null,

  setSession: (session) => set({ session }),

  loadProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) set({ profile: data as UserProfile });
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
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    if (data.user) {
      await supabase.from('users').insert({
        id:        data.user.id,
        email,
        full_name: fullName,
      });
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
    if (!error && data) set({ profile: data as UserProfile });
  },

  clearError: () => set({ error: null }),
}));

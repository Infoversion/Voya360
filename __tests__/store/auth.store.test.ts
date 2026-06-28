import { useAuthStore } from '@/store/auth.store';

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
    }),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false, error: null });
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('sets error on Supabase auth failure', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid login credentials' },
      });
      await useAuthStore.getState().signIn('test@example.com', 'wrong');
      expect(useAuthStore.getState().error).toBe('Invalid login credentials');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('clears error and sets isLoading=false on success', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      useAuthStore.setState({ error: 'old error' });
      await useAuthStore.getState().signIn('test@example.com', 'correct');
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('sets error to null', () => {
      useAuthStore.setState({ error: 'Something went wrong' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setSession', () => {
    it('updates session in store', () => {
      const mockSession = { user: { id: 'uid-1' } } as any;
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });
  });

  describe('signOut', () => {
    it('clears session and profile', async () => {
      mockSignOut.mockResolvedValueOnce({});
      useAuthStore.setState({
        session: { user: { id: 'uid-1' } } as any,
        profile: { id: 'uid-1', email: 'a@b.com' } as any,
      });
      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().profile).toBeNull();
    });
  });
});

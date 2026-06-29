import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { DUFFEL_STRIPE_KEY } from '@/lib/stripe';
import { VoyaProvider } from '@/components/voya/VoyaProvider';
import { registerPushToken } from '@/lib/notifications';

export default function RootLayout() {
  const { setSession, loadProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile();
        registerPushToken().catch(() => {}); // best-effort, non-blocking
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }).catch(() => router.replace('/(auth)/login'));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile();
        registerPushToken().catch(() => {});
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={DUFFEL_STRIPE_KEY}>
        <VoyaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </VoyaProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}

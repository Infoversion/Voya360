import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('voya360', {
        name:              'Voya360',
        importance:        Notifications.AndroidImportance.HIGH,
        vibrationPattern:  [0, 250, 250, 250],
        lightColor:        '#E8751A',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;

    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
    }

    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'f88408ac-e391-4876-84e7-8f7c814c785d',
    });

    if (!token) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('users').update({ push_token: token }).eq('id', user.id);
    }

    return token;
  } catch {
    return null;
  }
}

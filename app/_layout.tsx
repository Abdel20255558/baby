import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { FeedingProvider } from '@/context/FeedingContext';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'home') {
        router.push('/(tabs)');
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <FeedingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </FeedingProvider>
  );
}

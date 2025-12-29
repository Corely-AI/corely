import { useEffect } from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useSyncEngine } from '@/hooks/useSyncEngine';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialized, initialize } = useAuthStore();
  const { initializeSync } = useSyncEngine();

  useEffect(() => {
    async function init() {
      await initialize();
      await initializeSync();
      await SplashScreen.hideAsync();
    }
    init();
  }, []);

  if (!initialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}

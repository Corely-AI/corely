import { useEffect, useState } from "react";
import { Slot, SplashScreen } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { I18nextProvider } from "react-i18next";
import i18n, { initializeI18n } from "@/lib/i18n";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialized, initialize } = useAuthStore();
  const { initialize: initializeCatalog } = useCatalogStore();
  const { initialize: initializeRegister } = useRegisterStore();
  const { initialize: initializeSettings } = useSettingsStore();
  const { initializeSync } = useSyncEngine();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await initializeSettings();
        await initializeI18n(useSettingsStore.getState().language);
        await initialize();

        // Non-critical preload work should never block first paint.
        if (useAuthStore.getState().isAuthenticated) {
          void Promise.all([initializeCatalog(), initializeRegister()]).catch((error) => {
            console.error("POS preload failed:", error);
          });
        }

        // Sync startup must not block app render on web/simulators.
        void initializeSync();
      } catch (error) {
        console.error("POS app bootstrap failed:", error);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    void init();
  }, []);

  if (!initialized || !appReady || !i18n.isInitialized) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

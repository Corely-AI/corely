import { useCallback } from "react";
import { useRouter, type Href } from "expo-router";

export function usePosBackNavigation(fallbackHref: Href) {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  }, [fallbackHref, router]);
}

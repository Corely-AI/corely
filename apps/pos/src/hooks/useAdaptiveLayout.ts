import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { useSettingsStore, type LayoutMode } from "@/stores/settingsStore";
import { posTheme } from "@/ui/theme";

const TABLET_WIDTH = posTheme.breakpoints.tabletMin;
const WIDE_WIDTH = posTheme.breakpoints.wideMin;

export function resolveLayoutMode(
  forcedMode: LayoutMode,
  dimensions: { width: number; height: number }
): "PHONE" | "TABLET" {
  if (forcedMode === "PHONE") {
    return "PHONE";
  }
  if (forcedMode === "TABLET") {
    return "TABLET";
  }

  return dimensions.width >= TABLET_WIDTH ? "TABLET" : "PHONE";
}

export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();
  const layoutMode = useSettingsStore((state) => state.layoutMode);

  const resolved = useMemo(
    () => resolveLayoutMode(layoutMode, { width, height }),
    [height, layoutMode, width]
  );

  return {
    layoutMode,
    resolvedMode: resolved,
    isTablet: resolved === "TABLET",
    isWide: width >= WIDE_WIDTH,
    isLandscape: width > height,
    width,
    height,
  };
}

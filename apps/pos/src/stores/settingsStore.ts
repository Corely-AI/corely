import { create } from "zustand";
import { secureGetItem, secureSetItem } from "@/lib/secure-store";
import {
  getI18nLanguage,
  normalizeLanguageTag,
  resolveDeviceLanguage,
  setI18nLanguage,
  type SupportedLanguage as I18nSupportedLanguage,
} from "@/lib/i18n";

export type SupportedLanguage = I18nSupportedLanguage;

export type LayoutMode = "AUTO" | "PHONE" | "TABLET";

interface SettingsState {
  layoutMode: LayoutMode;
  language: SupportedLanguage;
  requireOpenShiftForSales: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  setLayoutMode: (layoutMode: LayoutMode) => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  setRequireOpenShiftForSales: (value: boolean) => Promise<void>;
}

const SETTINGS_KEYS = {
  layoutMode: "pos.layout-mode",
  language: "pos.language",
  requireOpenShiftForSales: "pos.require-open-shift-for-sales",
} as const;

const LEGACY_SETTINGS_KEYS = {
  layoutMode: "pos:layout-mode",
  language: "pos:language",
  requireOpenShiftForSales: "pos:require-open-shift-for-sales",
} as const;

async function readSetting(key: string): Promise<string | null> {
  return secureGetItem(key);
}

async function writeSetting(key: string, value: string): Promise<void> {
  await secureSetItem(key, value);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  layoutMode: "AUTO",
  language: "en",
  requireOpenShiftForSales: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    const [
      storedLayoutMode,
      storedLanguage,
      storedPolicy,
      legacyLayoutMode,
      legacyLanguage,
      legacyPolicy,
    ] = await Promise.all([
      readSetting(SETTINGS_KEYS.layoutMode),
      readSetting(SETTINGS_KEYS.language),
      readSetting(SETTINGS_KEYS.requireOpenShiftForSales),
      readSetting(LEGACY_SETTINGS_KEYS.layoutMode),
      readSetting(LEGACY_SETTINGS_KEYS.language),
      readSetting(LEGACY_SETTINGS_KEYS.requireOpenShiftForSales),
    ]);

    const nextStoredLayoutMode = storedLayoutMode ?? legacyLayoutMode;
    const nextStoredLanguage = storedLanguage ?? legacyLanguage;
    const nextStoredPolicy = storedPolicy ?? legacyPolicy;

    const nextLayoutMode: LayoutMode =
      nextStoredLayoutMode === "PHONE" ||
      nextStoredLayoutMode === "TABLET" ||
      nextStoredLayoutMode === "AUTO"
        ? nextStoredLayoutMode
        : "AUTO";
    const nextLanguage =
      normalizeLanguageTag(nextStoredLanguage) ??
      normalizeLanguageTag(getI18nLanguage()) ??
      resolveDeviceLanguage();

    await setI18nLanguage(nextLanguage);

    set({
      layoutMode: nextLayoutMode,
      language: nextLanguage,
      requireOpenShiftForSales: nextStoredPolicy !== "false",
      initialized: true,
    });
  },

  setLayoutMode: async (layoutMode) => {
    set({ layoutMode });
    await writeSetting(SETTINGS_KEYS.layoutMode, layoutMode);
  },

  setLanguage: async (language) => {
    set({ language });
    await setI18nLanguage(language);
    await writeSetting(SETTINGS_KEYS.language, language);
  },

  setRequireOpenShiftForSales: async (value) => {
    set({ requireOpenShiftForSales: value });
    await writeSetting(SETTINGS_KEYS.requireOpenShiftForSales, value ? "true" : "false");
  },
}));

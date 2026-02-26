import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const WEB_KEY_PREFIX = "corely-pos.secure.";

function normalizeWebKey(key: string): string {
  return `${WEB_KEY_PREFIX}${key.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

function webGetItem(key: string): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(normalizeWebKey(key));
  } catch {
    return null;
  }
}

function webSetItem(key: string, value: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(normalizeWebKey(key), value);
  } catch {
    // Ignore storage write failures in fallback mode.
  }
}

function webDeleteItem(key: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(normalizeWebKey(key));
  } catch {
    // Ignore storage delete failures in fallback mode.
  }
}

export async function secureGetItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return webGetItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    webSetItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore storage write failures to avoid crashing core POS flows.
  }
}

export async function secureDeleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    webDeleteItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore storage delete failures to avoid crashing core POS flows.
  }
}

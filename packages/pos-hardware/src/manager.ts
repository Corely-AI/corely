import { MockHardwareManager } from "./mock-provider";
import { NativeHardwareManager, isNativeHardwareAvailable } from "./native-provider";
import type { HardwareManager } from "./types";

let manager: HardwareManager | null = null;

export function getHardwareManager(): HardwareManager {
  if (manager) {
    return manager;
  }

  const preferred = process.env.EXPO_PUBLIC_POS_HARDWARE_PROVIDER ?? "auto";
  if (preferred === "mock") {
    manager = new MockHardwareManager();
    return manager;
  }

  if (preferred === "native" || preferred === "auto") {
    if (isNativeHardwareAvailable()) {
      manager = new NativeHardwareManager();
      return manager;
    }
  }

  manager = new MockHardwareManager();
  return manager;
}

export function setHardwareManagerForTesting(next: HardwareManager): void {
  manager = next;
}

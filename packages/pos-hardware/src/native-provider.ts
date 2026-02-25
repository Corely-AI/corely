import { requireOptionalNativeModule } from "expo-modules-core";
import type {
  HardwareCapability,
  HardwareDevice,
  HardwareManager,
  TseService,
  TseFinishTransactionInput,
  TseFinishTransactionResult,
  TseStartTransactionInput,
  TseStartTransactionResult,
} from "./types";

type NativeHardwareModule = {
  listDevices(): Promise<HardwareDevice[]>;
  connect(deviceId: string): Promise<void>;
  getCapabilities(): Promise<HardwareCapability[]>;
  initializeTse(): Promise<void>;
  startTseTransaction(input: TseStartTransactionInput): Promise<TseStartTransactionResult>;
  finishTseTransaction(input: TseFinishTransactionInput): Promise<TseFinishTransactionResult>;
  exportTseData(): Promise<string>;
  getTseStatus(): Promise<{ ready: boolean; mode: "NATIVE"; error?: string }>;
};

const moduleRef = requireOptionalNativeModule<NativeHardwareModule>("CorelyPosHardware");

class NativeTseService implements TseService {
  constructor(private readonly moduleApi: NativeHardwareModule) {}

  initialize(): Promise<void> {
    return this.moduleApi.initializeTse();
  }

  startTransaction(input: TseStartTransactionInput): Promise<TseStartTransactionResult> {
    return this.moduleApi.startTseTransaction(input);
  }

  finishTransaction(input: TseFinishTransactionInput): Promise<TseFinishTransactionResult> {
    return this.moduleApi.finishTseTransaction(input);
  }

  exportData(): Promise<string> {
    return this.moduleApi.exportTseData();
  }

  getStatus(): Promise<{ ready: boolean; mode: "NATIVE"; error?: string }> {
    return this.moduleApi.getTseStatus();
  }
}

export class NativeHardwareManager implements HardwareManager {
  private readonly tseService = moduleRef ? new NativeTseService(moduleRef) : null;

  async listDevices(): Promise<HardwareDevice[]> {
    if (!moduleRef) {
      return [];
    }
    return moduleRef.listDevices();
  }

  async connect(deviceId: string): Promise<void> {
    if (!moduleRef) {
      throw new Error("CorelyPosHardware native module unavailable");
    }
    await moduleRef.connect(deviceId);
  }

  async getCapabilities(): Promise<HardwareCapability[]> {
    if (!moduleRef) {
      return [];
    }
    return moduleRef.getCapabilities();
  }

  getTseService(): TseService {
    if (!this.tseService) {
      throw new Error("CorelyPosHardware native module unavailable");
    }
    return this.tseService;
  }

  subscribeStatus(
    listener: (status: { deviceId: string | null; connected: boolean; error?: string }) => void
  ): () => void {
    if (!moduleRef) {
      listener({ deviceId: null, connected: false, error: "Native module unavailable" });
      return () => {};
    }
    listener({ deviceId: null, connected: true });
    return () => {};
  }
}

export function isNativeHardwareAvailable(): boolean {
  return Boolean(moduleRef);
}

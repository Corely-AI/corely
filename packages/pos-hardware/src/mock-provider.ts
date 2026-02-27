import {
  type HardwareCapability,
  type HardwareDevice,
  type HardwareManager,
  type TseService,
  type TseFinishTransactionInput,
  type TseFinishTransactionResult,
  type TseStartTransactionInput,
  type TseStartTransactionResult,
} from "./types";

const MOCK_DEVICE: HardwareDevice = {
  id: "mock-tse-device",
  name: "Mock USB TSE",
  vendor: "Corely Mock",
  connected: true,
  capabilities: ["TSE"],
};

class MockTseService implements TseService {
  async initialize(): Promise<void> {
    return;
  }

  async startTransaction(_input: TseStartTransactionInput): Promise<TseStartTransactionResult> {
    return {
      transactionId: `mock-${Date.now()}`,
      startedAt: new Date().toISOString(),
    };
  }

  async finishTransaction(input: TseFinishTransactionInput): Promise<TseFinishTransactionResult> {
    return {
      transactionId: input.transactionId,
      signature: `MOCK-SIG-${Math.abs(input.totalCents).toString(16).toUpperCase()}`,
      finishedAt: new Date().toISOString(),
    };
  }

  async exportData(): Promise<string> {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        provider: "mock",
      },
      null,
      2
    );
  }

  async getStatus(): Promise<{ ready: boolean; mode: "MOCK"; error?: string }> {
    return {
      ready: true,
      mode: "MOCK",
    };
  }
}

export class MockHardwareManager implements HardwareManager {
  private listeners = new Set<
    (status: { deviceId: string | null; connected: boolean; error?: string }) => void
  >();

  private activeDeviceId: string | null = MOCK_DEVICE.id;

  async listDevices(): Promise<HardwareDevice[]> {
    return [MOCK_DEVICE];
  }

  async connect(deviceId: string): Promise<void> {
    if (deviceId !== MOCK_DEVICE.id) {
      throw new Error(`Unknown mock device ${deviceId}`);
    }
    this.activeDeviceId = deviceId;
    this.emit({ deviceId, connected: true });
  }

  async getCapabilities(): Promise<HardwareCapability[]> {
    return ["TSE"];
  }

  getTseService(): TseService {
    return new MockTseService();
  }

  subscribeStatus(
    listener: (status: { deviceId: string | null; connected: boolean; error?: string }) => void
  ): () => void {
    this.listeners.add(listener);
    listener({
      deviceId: this.activeDeviceId,
      connected: true,
    });
    return () => this.listeners.delete(listener);
  }

  private emit(status: { deviceId: string | null; connected: boolean; error?: string }) {
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}

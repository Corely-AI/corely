export type HardwareCapability = "TSE" | "RECEIPT_PRINTER" | "BARCODE_SCANNER" | "CASH_DRAWER";

export interface HardwareDevice {
  id: string;
  name: string;
  vendor?: string;
  connected: boolean;
  capabilities: HardwareCapability[];
}

export interface TseStatus {
  ready: boolean;
  mode: "MOCK" | "NATIVE";
  error?: string;
}

export interface TseStartTransactionInput {
  registerId: string;
  amountCents: number;
  saleId: string | null;
}

export interface TseStartTransactionResult {
  transactionId: string;
  startedAt: string;
}

export interface TseFinishTransactionInput {
  transactionId: string;
  totalCents: number;
}

export interface TseFinishTransactionResult {
  transactionId: string;
  signature: string;
  finishedAt: string;
}

export interface TseService {
  initialize(): Promise<void>;
  startTransaction(input: TseStartTransactionInput): Promise<TseStartTransactionResult>;
  finishTransaction(input: TseFinishTransactionInput): Promise<TseFinishTransactionResult>;
  exportData(): Promise<string>;
  getStatus(): Promise<TseStatus>;
}

export interface HardwareManager {
  listDevices(): Promise<HardwareDevice[]>;
  connect(deviceId: string): Promise<void>;
  getCapabilities(): Promise<HardwareCapability[]>;
  getTseService(): TseService;
  subscribeStatus(
    listener: (status: { deviceId: string | null; connected: boolean; error?: string }) => void
  ): () => void;
}

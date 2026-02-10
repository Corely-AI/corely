import type {
  ImportShipmentProps,
  ImportShipmentStatus,
  ShippingMode,
} from "../../domain/import-shipment.entity";

export interface ListShipmentsFilters {
  supplierPartyId?: string;
  status?: ImportShipmentStatus;
  shippingMode?: ShippingMode;
  estimatedArrivalAfter?: string; // LocalDate
  estimatedArrivalBefore?: string; // LocalDate
  actualArrivalAfter?: string; // LocalDate
  actualArrivalBefore?: string; // LocalDate
  containerNumber?: string;
  billOfLadingNumber?: string;
  limit?: number;
  offset?: number;
}

export interface ImportShipmentRepositoryPort {
  /**
   * Create a new import shipment
   */
  create(tenantId: string, shipment: ImportShipmentProps): Promise<ImportShipmentProps>;

  /**
   * Find shipment by ID
   */
  findById(tenantId: string, shipmentId: string): Promise<ImportShipmentProps | null>;

  /**
   * Find shipment by shipment number
   */
  findByShipmentNumber(
    tenantId: string,
    shipmentNumber: string
  ): Promise<ImportShipmentProps | null>;

  /**
   * Update existing shipment
   */
  update(tenantId: string, shipment: ImportShipmentProps): Promise<ImportShipmentProps>;

  /**
   * List shipments with filters and pagination
   */
  list(
    tenantId: string,
    filters: ListShipmentsFilters
  ): Promise<{ shipments: ImportShipmentProps[]; total: number }>;

  /**
   * Get next shipment number
   */
  getNextShipmentNumber(tenantId: string): Promise<string>;
}

export const IMPORT_SHIPMENT_REPOSITORY = Symbol("IMPORT_SHIPMENT_REPOSITORY");

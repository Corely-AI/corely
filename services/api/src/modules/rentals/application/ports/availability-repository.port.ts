import { type RentalAvailabilityRange, type AvailabilityStatus } from "@corely/contracts";

export interface AvailabilityRepoPort {
  findByPropertyId(tenantId: string, propertyId: string): Promise<RentalAvailabilityRange[]>;
  findOverlapping(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    status?: AvailabilityStatus
  ): Promise<RentalAvailabilityRange[]>;
  saveRange(
    tenantId: string,
    workspaceId: string,
    propertyId: string,
    range: Omit<RentalAvailabilityRange, "id">
  ): Promise<RentalAvailabilityRange>;
  deleteRange(tenantId: string, id: string): Promise<void>;
  replaceRanges(
    tenantId: string,
    workspaceId: string,
    propertyId: string,
    ranges: Omit<RentalAvailabilityRange, "id">[]
  ): Promise<void>;
}

export const AVAILABILITY_REPO_PORT = Symbol("AVAILABILITY_REPO_PORT");

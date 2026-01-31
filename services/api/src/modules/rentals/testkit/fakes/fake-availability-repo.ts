import { type AvailabilityRepoPort } from "../../application/ports/availability-repository.port";
import { type RentalAvailabilityRange, type AvailabilityStatus } from "@corely/contracts";

export class FakeAvailabilityRepo implements AvailabilityRepoPort {
  public ranges: RentalAvailabilityRange[] = [];

  async findByPropertyId(tenantId: string, propertyId: string): Promise<RentalAvailabilityRange[]> {
    return this.ranges.filter((r) => r.id.startsWith(propertyId)); // Approximation
  }

  async findOverlapping(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    status?: AvailabilityStatus
  ): Promise<RentalAvailabilityRange[]> {
    return this.ranges.filter((r) => {
      const matchProperty = true; // Simplified for fake if we don't store propertyId explicitly in the range object we use here
      // Wait, RentalAvailabilityRange probably doesn't have propertyId in some versions but the port has it.
      // Let's assume the fake store it.

      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);

      const overlap = rStart < endDate && rEnd > startDate;
      const matchStatus = status ? r.status === status : true;

      return overlap && matchStatus;
    });
  }

  async saveRange(
    tenantId: string,
    workspaceId: string,
    propertyId: string,
    range: Omit<RentalAvailabilityRange, "id">
  ): Promise<RentalAvailabilityRange> {
    const newRange: RentalAvailabilityRange = {
      id: `range-${Math.random().toString(36).substr(2, 9)}`,
      ...range,
    } as any;
    this.ranges.push(newRange);
    return newRange;
  }

  async deleteRange(tenantId: string, id: string): Promise<void> {
    this.ranges = this.ranges.filter((r) => r.id !== id);
  }

  async replaceRanges(
    tenantId: string,
    workspaceId: string,
    propertyId: string,
    ranges: Omit<RentalAvailabilityRange, "id">[]
  ): Promise<void> {
    // Simplified: clear and add
    this.ranges = ranges.map((r) => ({ id: `range-${Math.random()}`, ...r }) as any);
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { RentalAvailabilityRange, AvailabilityStatus } from "@corely/contracts";
import { AvailabilityRepoPort } from "../../application/ports/availability-repository.port";

@Injectable()
export class PrismaAvailabilityRepoAdapter implements AvailabilityRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: any): RentalAvailabilityRange {
    return {
      id: row.id,
      startDate: row.startDate.toISOString().split("T")[0],
      endDate: row.endDate.toISOString().split("T")[0],
      status: row.status,
      note: row.note,
    };
  }

  async findByPropertyId(tenantId: string, propertyId: string): Promise<RentalAvailabilityRange[]> {
    const rows = await this.prisma.rentalAvailabilityRange.findMany({
      where: { propertyId, tenantId },
      orderBy: { startDate: "asc" },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async findOverlapping(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    status?: AvailabilityStatus
  ): Promise<RentalAvailabilityRange[]> {
    const rows = await this.prisma.rentalAvailabilityRange.findMany({
      where: {
        propertyId,
        status,
        OR: [
          {
            // Range starts within [startDate, endDate)
            startDate: { gte: startDate, lt: endDate },
          },
          {
            // Range ends within (startDate, endDate]
            endDate: { gt: startDate, lte: endDate },
          },
          {
            // Range covers [startDate, endDate]
            startDate: { lte: startDate },
            endDate: { gte: endDate },
          },
        ],
      },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async saveRange(
    tenantId: string,
    workspaceId: string,
    propertyId: string,
    range: any
  ): Promise<RentalAvailabilityRange> {
    const created = await this.prisma.rentalAvailabilityRange.create({
      data: {
        ...range,
        startDate: new Date(range.startDate),
        endDate: new Date(range.endDate),
        propertyId,
        tenantId,
        workspaceId,
      },
    });
    return this.mapRow(created);
  }

  async deleteRange(tenantId: string, id: string): Promise<void> {
    await this.prisma.rentalAvailabilityRange.deleteMany({
      where: { id, tenantId },
    });
  }

  async replaceRanges(
    tenantId: string,
    workspaceId: string,
    propertyId: string,
    ranges: any[]
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.rentalAvailabilityRange.deleteMany({ where: { propertyId, tenantId } }),
      this.prisma.rentalAvailabilityRange.createMany({
        data: ranges.map((r) => ({
          ...r,
          startDate: new Date(r.startDate),
          endDate: new Date(r.endDate),
          propertyId,
          tenantId,
          workspaceId,
        })),
      }),
    ]);
  }
}

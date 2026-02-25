import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  BirthdayCustomerRecord,
  BirthdayRepositoryPort,
} from "../../application/ports/birthday-repository.port";

@Injectable()
export class PrismaBirthdayRepositoryAdapter implements BirthdayRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomerBirthdays(tenantId: string): Promise<BirthdayCustomerRecord[]> {
    const rows = await this.prisma.party.findMany({
      where: {
        tenantId,
        archivedAt: null,
        birthday: { not: null },
        roles: { some: { role: "CUSTOMER" } },
      },
      select: {
        id: true,
        displayName: true,
        birthday: true,
      },
    });

    return rows
      .filter(
        (row): row is { id: string; displayName: string; birthday: Date } => row.birthday !== null
      )
      .map((row) => ({
        customerPartyId: row.id,
        displayName: row.displayName,
        birthday: row.birthday,
      }));
  }
}

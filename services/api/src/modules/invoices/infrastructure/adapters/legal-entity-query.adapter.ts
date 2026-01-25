import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { type LegalEntityQueryPort } from "../../application/ports/legal-entity-query.port";
import { type IssuerSnapshot } from "../../domain/invoice.types";

@Injectable()
export class PrismaLegalEntityQueryAdapter implements LegalEntityQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getIssuerSnapshot(
    tenantId: string,
    legalEntityId?: string
  ): Promise<IssuerSnapshot | null> {
    // If legalEntityId is provided, use it. Otherwise try to find one linked to a workspace or default.
    // For now, if no ID, we might pick the first one or fail?
    // The requirement says "defaults mostly".
    // Let's assume the use case handles "defaulting" logic by passing ID, OR we find a default here.
    
    let entity;

    if (legalEntityId) {
      entity = await this.prisma.legalEntity.findFirst({
        where: { id: legalEntityId, tenantId },
      });
    } else {
      // Find default (fallback to first found for now)
      entity = await this.prisma.legalEntity.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" }, // consistent default
      });
    }

    if (!entity) return null;

    const address = entity.address as any;
    
    return {
      name: entity.legalName,
      address: address ? {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        postalCode: address.postalCode,
        country: entity.countryCode, // or address.countryCode
      } : undefined,
      taxId: entity.taxId ?? undefined,
      vatId: entity.vatId ?? undefined,
      contact: {
        phone: entity.phone ?? undefined,
        email: entity.email ?? undefined,
        website: entity.website ?? undefined,
      },
    };
  }
}

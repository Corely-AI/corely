import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { PersonalTaxStrategy } from "./personal-tax-strategy";
import { CompanyTaxStrategy } from "./company-tax-strategy";
import { TaxComputationStrategy } from "./tax-strategy";

@Injectable()
export class TaxStrategyResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly personal: PersonalTaxStrategy,
    private readonly company: CompanyTaxStrategy
  ) {}

  async resolve(tenantId: string): Promise<TaxComputationStrategy> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { tenantId },
      include: { legalEntity: true },
    });
    const kind = workspace?.legalEntity?.kind ?? "PERSONAL";
    return kind === "COMPANY" ? this.company : this.personal;
  }
}

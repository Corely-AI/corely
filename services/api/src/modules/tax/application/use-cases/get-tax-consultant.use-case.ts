import { Injectable } from "@nestjs/common";
import type { GetTaxConsultantOutput } from "@corely/contracts";
import { TaxConsultantRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class GetTaxConsultantUseCase {
  constructor(private readonly repo: TaxConsultantRepoPort) {}

  async execute(ctx: UseCaseContext): Promise<GetTaxConsultantOutput> {
    const consultant = await this.repo.get(ctx.tenantId);
    return {
      consultant: consultant
        ? {
            id: consultant.id,
            tenantId: consultant.tenantId,
            name: consultant.name,
            email: consultant.email ?? null,
            phone: consultant.phone ?? null,
            notes: consultant.notes ?? null,
            createdAt: consultant.createdAt.toISOString(),
            updatedAt: consultant.updatedAt.toISOString(),
          }
        : null,
    };
  }
}

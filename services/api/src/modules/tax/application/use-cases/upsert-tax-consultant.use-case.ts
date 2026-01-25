import { Injectable } from "@nestjs/common";
import type { UpsertTaxConsultantInput, UpsertTaxConsultantOutput } from "@corely/contracts";
import { TaxConsultantRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class UpsertTaxConsultantUseCase {
  constructor(private readonly repo: TaxConsultantRepoPort) {}

  async execute(
    input: UpsertTaxConsultantInput,
    ctx: UseCaseContext
  ): Promise<UpsertTaxConsultantOutput> {
    const consultant = await this.repo.upsert(ctx.workspaceId, {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    });

    return {
      consultant: {
        id: consultant.id,
        tenantId: consultant.tenantId,
        name: consultant.name,
        email: consultant.email ?? null,
        phone: consultant.phone ?? null,
        notes: consultant.notes ?? null,
        createdAt: consultant.createdAt.toISOString(),
        updatedAt: consultant.updatedAt.toISOString(),
      },
    };
  }
}

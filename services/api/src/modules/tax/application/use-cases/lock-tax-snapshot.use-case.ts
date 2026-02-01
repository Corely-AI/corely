import { Injectable } from "@nestjs/common";
import type { LockTaxSnapshotInput, TaxSnapshotDto } from "@corely/contracts";
import { TaxEngineService } from "../services/tax-engine.service";
import { TaxSnapshotRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import { TaxSnapshot } from "../../domain/entities";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

/**
 * Lock Tax Snapshot Use Case
 * Creates immutable tax calculation for finalized documents
 * MUST be idempotent based on (tenantId, sourceType, sourceId)
 */
@RequireTenant()
@Injectable()
export class LockTaxSnapshotUseCase extends BaseUseCase<LockTaxSnapshotInput, TaxSnapshotDto> {
  constructor(
    private readonly snapshotRepo: TaxSnapshotRepoPort,
    private readonly profileRepo: TaxProfileRepoPort,
    private readonly taxEngine: TaxEngineService
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: LockTaxSnapshotInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxSnapshotDto, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;

    // Check if snapshot already exists (idempotency)
    const existing = await this.snapshotRepo.findBySource(
      workspaceId,
      input.sourceType,
      input.sourceId
    );

    if (existing) {
      // Return existing snapshot
      return ok(this.toDto(existing));
    }

    // Calculate tax breakdown
    const breakdown = await this.taxEngine.calculate(
      {
        jurisdiction: input.jurisdiction,
        documentDate: input.documentDate,
        currency: input.currency,
        customer: input.customer,
        lines: input.lines,
      },
      workspaceId
    );

    // Get profile for regime info
    const documentDate = new Date(input.documentDate);
    const profile = await this.profileRepo.getActive(workspaceId, documentDate);

    if (!profile) {
      throw new Error("No active tax profile found");
    }

    // Create immutable snapshot
    const snapshot = TaxSnapshot.create({
      tenantId: workspaceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      jurisdiction: input.jurisdiction || "DE",
      regime: profile.regime,
      roundingMode: breakdown.roundingMode,
      currency: input.currency,
      calculatedAt: new Date(),
      subtotalAmountCents: breakdown.subtotalAmountCents,
      taxTotalAmountCents: breakdown.taxTotalAmountCents,
      totalAmountCents: breakdown.totalAmountCents,
      breakdownJson: JSON.stringify(breakdown),
    });

    const created = await this.snapshotRepo.lockSnapshot(snapshot);

    return ok(this.toDto(created));
  }

  private toDto(entity: any): TaxSnapshotDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      sourceType: entity.sourceType,
      sourceId: entity.sourceId,
      jurisdiction: entity.jurisdiction,
      regime: entity.regime,
      roundingMode: entity.roundingMode,
      currency: entity.currency,
      calculatedAt: entity.calculatedAt.toISOString(),
      subtotalAmountCents: entity.subtotalAmountCents,
      taxTotalAmountCents: entity.taxTotalAmountCents,
      totalAmountCents: entity.totalAmountCents,
      breakdownJson: entity.breakdownJson,
      version: entity.version,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import type { PartyRepoPort } from "../ports/party-repository.port";
import type { PartyLifecycleStatus } from "../../domain/party.aggregate";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { type PrismaService } from "@corely/data"; // For tracking transition

export interface UpdateLifecycleStatusInput {
  partyId: string;
  status: PartyLifecycleStatus;
  reason?: string;
}

export class UpdatePartyLifecycleStatusUseCase extends BaseUseCase<
  UpdateLifecycleStatusInput,
  void
> {
  constructor(
    private readonly useCaseDeps: {
      logger: LoggerPort;
      partyRepo: PartyRepoPort;
      audit: AuditPort;
      prisma: PrismaService;
    }
  ) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: UpdateLifecycleStatusInput,
    ctx: UseCaseContext
  ): Promise<Result<void, UseCaseError>> {
    const { tenantId, userId } = ctx;
    if (!tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const party = await this.useCaseDeps.partyRepo.findPartyById(tenantId, input.partyId);
    if (!party) {
      return err(new NotFoundError("Party not found"));
    }

    if (party.lifecycleStatus === input.status) {
      return ok(undefined);
    }

    const fromStatus = party.lifecycleStatus;

    // Update aggregate
    party.lifecycleStatus = input.status;

    // Persist status update and history in a transaction
    await this.useCaseDeps.prisma.$transaction(async (tx) => {
      // 1. Update party record
      await (this.useCaseDeps.partyRepo as any).updateCustomer(tenantId, party, tx);

      // 2. record history transition
      await (tx as any).partyLifecycleTransition.create({
        data: {
          tenantId,
          partyId: party.id,
          fromStatus: fromStatus as any,
          toStatus: input.status as any,
          reason: input.reason,
          changedByUserId: userId || "system",
        },
      });
    });

    await this.useCaseDeps.audit.log({
      tenantId,
      userId: userId || "system",
      action: "party.lifecycle.status_updated",
      entityType: "Party",
      entityId: party.id,
      metadata: {
        from: fromStatus,
        to: input.status,
        reason: input.reason,
      },
    });

    return ok(undefined);
  }
}

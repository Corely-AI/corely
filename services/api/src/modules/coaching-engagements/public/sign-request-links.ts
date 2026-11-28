import { Injectable, Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { PrismaCoachingEngagementRepositoryAdapter } from "../infrastructure/persist/prisma-coaching-engagement-repository.adapter";

@Injectable()
export class CoachingSignRequestLinks {
  constructor(private readonly agreements: PrismaCoachingEngagementRepositoryAdapter) {}

  async hasLink(
    request: { tenantId: string; workspaceId: string; requestId: string },
    tx?: TransactionContext
  ) {
    const { tenantId, workspaceId, requestId } = request;
    return Boolean(
      await this.agreements.nativeAgreementEvent(tenantId, workspaceId, "prepared", requestId, tx)
    );
  }
}

@Module({
  imports: [DataModule],
  providers: [PrismaCoachingEngagementRepositoryAdapter, CoachingSignRequestLinks],
  exports: [CoachingSignRequestLinks],
})
export class CoachingSignRequestLinksModule {}

import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { ApprovalPolicyService } from "./application/approval-policy.service";
import { APPROVAL_POLICY_REPOSITORY_TOKEN } from "./application/ports/approval-policy-repository.port";
import { PrismaApprovalPolicyRepository } from "./infrastructure/repositories/prisma-approval-policy-repository";

@Module({
  imports: [DataModule],
  providers: [
    ApprovalPolicyService,
    { provide: APPROVAL_POLICY_REPOSITORY_TOKEN, useClass: PrismaApprovalPolicyRepository },
  ],
  exports: [ApprovalPolicyService],
})
export class ApprovalPoliciesModule {}

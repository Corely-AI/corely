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
import type { UnlinkGuardianOutput } from "@corely/contracts";
import type { ExtEntityLinkPort } from "@corely/data";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type { PartyRepoPort } from "../../ports/party-repository.port";
import {
  PARTY_ENTITY_TYPE,
  STUDENT_GUARDIAN_LINK_TYPE,
  STUDENT_GUARDIAN_MODULE_ID,
  parseGuardianMetadata,
} from "./guardian-link.utils";

type UnlinkGuardianInput = { studentId: string; guardianClientId: string };

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  entityLink: ExtEntityLinkPort;
  audit: AuditPort;
};

export class UnlinkGuardianUseCase extends BaseUseCase<UnlinkGuardianInput, UnlinkGuardianOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: UnlinkGuardianInput,
    ctx: UseCaseContext
  ): Promise<Result<UnlinkGuardianOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    if (!input.guardianClientId) {
      return err(new ValidationError("guardianClientId is required"));
    }

    const student = await this.useCaseDeps.partyRepo.findCustomerById(
      ctx.tenantId,
      input.studentId,
      "STUDENT"
    );
    if (!student) {
      return err(new NotFoundError("Student not found"));
    }

    const guardian = await this.useCaseDeps.partyRepo.findPartyById(
      ctx.tenantId,
      input.guardianClientId
    );
    if (!guardian) {
      return err(new NotFoundError("Guardian not found"));
    }

    const existing = await this.useCaseDeps.entityLink.list({
      tenantId: ctx.tenantId,
      moduleId: STUDENT_GUARDIAN_MODULE_ID,
      fromEntityType: PARTY_ENTITY_TYPE,
      fromEntityId: input.guardianClientId,
      toEntityType: PARTY_ENTITY_TYPE,
      toEntityId: input.studentId,
      linkType: STUDENT_GUARDIAN_LINK_TYPE,
    });

    if (existing[0]) {
      await this.useCaseDeps.entityLink.delete({
        tenantId: ctx.tenantId,
        moduleId: STUDENT_GUARDIAN_MODULE_ID,
        fromEntityType: PARTY_ENTITY_TYPE,
        fromEntityId: input.guardianClientId,
        toEntityType: PARTY_ENTITY_TYPE,
        toEntityId: input.studentId,
        linkType: STUDENT_GUARDIAN_LINK_TYPE,
      });
    }

    await this.useCaseDeps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "party.student.guardian.unlinked",
      entityType: "Party",
      entityId: input.studentId,
      metadata: { guardianClientId: input.guardianClientId },
    });

    const output = await this.buildOutput(ctx.tenantId, input.studentId);
    return ok(output);
  }

  private async buildOutput(tenantId: string, studentId: string): Promise<UnlinkGuardianOutput> {
    const links = await this.useCaseDeps.entityLink.list({
      tenantId,
      moduleId: STUDENT_GUARDIAN_MODULE_ID,
      toEntityType: PARTY_ENTITY_TYPE,
      toEntityId: studentId,
      linkType: STUDENT_GUARDIAN_LINK_TYPE,
    });

    const guardians = (
      await Promise.all(
        links.map(async (link) => {
          const guardian = await this.useCaseDeps.partyRepo.findPartyById(
            tenantId,
            link.fromEntityId
          );
          if (!guardian) {
            return null;
          }
          const metadata = parseGuardianMetadata(link.metadata);
          return {
            guardian: toCustomerDto(guardian),
            isPrimaryPayer: Boolean(metadata.isPrimaryPayer),
            isPrimaryContact: Boolean(metadata.isPrimaryContact),
          };
        })
      )
    ).filter((item): item is NonNullable<typeof item> => Boolean(item));

    return { studentId, guardians };
  }
}

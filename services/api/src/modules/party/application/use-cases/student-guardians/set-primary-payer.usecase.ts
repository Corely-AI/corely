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
import type { SetPrimaryPayerInput, SetPrimaryPayerOutput } from "@corely/contracts";
import type { ExtEntityLinkPort } from "@corely/data";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type { PartyRepoPort } from "../../ports/party-repository.port";
import {
  PARTY_ENTITY_TYPE,
  STUDENT_GUARDIAN_LINK_TYPE,
  STUDENT_GUARDIAN_MODULE_ID,
  parseGuardianMetadata,
} from "./guardian-link.utils";

type SetPrimaryPayerForStudentInput = SetPrimaryPayerInput & { studentId: string };

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  entityLink: ExtEntityLinkPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class SetPrimaryPayerUseCase extends BaseUseCase<
  SetPrimaryPayerForStudentInput,
  SetPrimaryPayerOutput
> {
  private readonly actionKey = "party.student.guardian.primaryPayer";

  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: SetPrimaryPayerForStudentInput,
    ctx: UseCaseContext
  ): Promise<Result<SetPrimaryPayerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    if (!input.guardianClientId) {
      return err(new ValidationError("guardianClientId is required"));
    }

    if (input.idempotencyKey) {
      const cached = await this.useCaseDeps.idempotency.get(
        this.actionKey,
        ctx.tenantId,
        input.idempotencyKey
      );
      if (cached?.body) {
        return ok(cached.body as SetPrimaryPayerOutput);
      }
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

    const links = await this.useCaseDeps.entityLink.list({
      tenantId: ctx.tenantId,
      moduleId: STUDENT_GUARDIAN_MODULE_ID,
      toEntityType: PARTY_ENTITY_TYPE,
      toEntityId: input.studentId,
      linkType: STUDENT_GUARDIAN_LINK_TYPE,
    });

    const target = links.find((link) => link.fromEntityId === input.guardianClientId);
    if (!target) {
      return err(new NotFoundError("Guardian link not found"));
    }

    await Promise.all(
      links.map(async (link) => {
        const metadata = parseGuardianMetadata(link.metadata);
        const shouldBePrimary = link.fromEntityId === input.guardianClientId;
        if (metadata.isPrimaryPayer === shouldBePrimary) {
          return;
        }
        await this.useCaseDeps.entityLink.update({
          tenantId: ctx.tenantId,
          moduleId: STUDENT_GUARDIAN_MODULE_ID,
          fromEntityType: link.fromEntityType,
          fromEntityId: link.fromEntityId,
          toEntityType: link.toEntityType,
          toEntityId: link.toEntityId,
          linkType: link.linkType,
          metadata: { ...metadata, isPrimaryPayer: shouldBePrimary },
        });
      })
    );

    await this.useCaseDeps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "party.student.guardian.primaryPayerChanged",
      entityType: "Party",
      entityId: input.studentId,
      metadata: { guardianClientId: input.guardianClientId },
    });

    const output = await this.buildOutput(ctx.tenantId, input.studentId);

    if (input.idempotencyKey) {
      await this.useCaseDeps.idempotency.store(this.actionKey, ctx.tenantId, input.idempotencyKey, {
        body: output,
      });
    }

    return ok(output);
  }

  private async buildOutput(tenantId: string, studentId: string): Promise<SetPrimaryPayerOutput> {
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

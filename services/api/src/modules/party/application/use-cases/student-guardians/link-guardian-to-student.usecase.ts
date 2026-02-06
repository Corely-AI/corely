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
import type { LinkGuardianInput, LinkGuardianOutput } from "@corely/contracts";
import type { ExtEntityLinkPort } from "@corely/data";
import type { AuditPort } from "../../../../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../../../../shared/ports/idempotency-storage.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type { PartyRepoPort } from "../../ports/party-repository.port";
import {
  PARTY_ENTITY_TYPE,
  STUDENT_GUARDIAN_LINK_TYPE,
  STUDENT_GUARDIAN_MODULE_ID,
  mergeGuardianMetadata,
  parseGuardianMetadata,
} from "./guardian-link.utils";

type LinkGuardianToStudentInput = LinkGuardianInput & { studentId: string };

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  entityLink: ExtEntityLinkPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export class LinkGuardianToStudentUseCase extends BaseUseCase<
  LinkGuardianToStudentInput,
  LinkGuardianOutput
> {
  private readonly actionKey = "party.student.guardian.link";

  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: LinkGuardianToStudentInput,
    ctx: UseCaseContext
  ): Promise<Result<LinkGuardianOutput, UseCaseError>> {
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
        return ok(cached.body as LinkGuardianOutput);
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

    await this.useCaseDeps.partyRepo.ensurePartyRole(
      ctx.tenantId,
      input.guardianClientId,
      "GUARDIAN"
    );

    const existing = await this.useCaseDeps.entityLink.list({
      tenantId: ctx.tenantId,
      moduleId: STUDENT_GUARDIAN_MODULE_ID,
      fromEntityType: PARTY_ENTITY_TYPE,
      fromEntityId: input.guardianClientId,
      toEntityType: PARTY_ENTITY_TYPE,
      toEntityId: input.studentId,
      linkType: STUDENT_GUARDIAN_LINK_TYPE,
    });

    const currentMetadata = existing[0] ? parseGuardianMetadata(existing[0].metadata) : {};
    const nextMetadata = mergeGuardianMetadata(currentMetadata, {
      isPrimaryPayer: input.isPrimaryPayer,
      isPrimaryContact: input.isPrimaryContact,
    });

    if (existing[0]) {
      await this.useCaseDeps.entityLink.update({
        tenantId: ctx.tenantId,
        moduleId: STUDENT_GUARDIAN_MODULE_ID,
        fromEntityType: PARTY_ENTITY_TYPE,
        fromEntityId: input.guardianClientId,
        toEntityType: PARTY_ENTITY_TYPE,
        toEntityId: input.studentId,
        linkType: STUDENT_GUARDIAN_LINK_TYPE,
        metadata: nextMetadata,
      });
    } else {
      await this.useCaseDeps.entityLink.create({
        tenantId: ctx.tenantId,
        moduleId: STUDENT_GUARDIAN_MODULE_ID,
        fromEntityType: PARTY_ENTITY_TYPE,
        fromEntityId: input.guardianClientId,
        toEntityType: PARTY_ENTITY_TYPE,
        toEntityId: input.studentId,
        linkType: STUDENT_GUARDIAN_LINK_TYPE,
        metadata: nextMetadata,
      });
    }

    if (nextMetadata.isPrimaryPayer) {
      await this.unsetOtherPrimaryPayers(ctx.tenantId, input.studentId, input.guardianClientId);
    }

    await this.useCaseDeps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "party.student.guardian.linked",
      entityType: "Party",
      entityId: input.studentId,
      metadata: {
        guardianClientId: input.guardianClientId,
        isPrimaryPayer: Boolean(nextMetadata.isPrimaryPayer),
        isPrimaryContact: Boolean(nextMetadata.isPrimaryContact),
      },
    });

    const output = await this.buildOutput(ctx.tenantId, input.studentId);

    if (input.idempotencyKey) {
      await this.useCaseDeps.idempotency.store(this.actionKey, ctx.tenantId, input.idempotencyKey, {
        body: output,
      });
    }

    return ok(output);
  }

  private async unsetOtherPrimaryPayers(tenantId: string, studentId: string, guardianId: string) {
    const links = await this.useCaseDeps.entityLink.list({
      tenantId,
      moduleId: STUDENT_GUARDIAN_MODULE_ID,
      toEntityType: PARTY_ENTITY_TYPE,
      toEntityId: studentId,
      linkType: STUDENT_GUARDIAN_LINK_TYPE,
    });

    await Promise.all(
      links.map(async (link) => {
        if (link.fromEntityId === guardianId) {
          return;
        }
        const metadata = parseGuardianMetadata(link.metadata);
        if (!metadata.isPrimaryPayer) {
          return;
        }
        await this.useCaseDeps.entityLink.update({
          tenantId,
          moduleId: STUDENT_GUARDIAN_MODULE_ID,
          fromEntityType: link.fromEntityType,
          fromEntityId: link.fromEntityId,
          toEntityType: link.toEntityType,
          toEntityId: link.toEntityId,
          linkType: link.linkType,
          metadata: { ...metadata, isPrimaryPayer: false },
        });
      })
    );
  }

  private async buildOutput(tenantId: string, studentId: string): Promise<LinkGuardianOutput> {
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

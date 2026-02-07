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
import type { ListStudentGuardiansInput, ListStudentGuardiansOutput } from "@corely/contracts";
import type { ExtEntityLinkPort } from "@corely/data";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type { PartyRepoPort } from "../../ports/party-repository.port";
import {
  PARTY_ENTITY_TYPE,
  STUDENT_GUARDIAN_LINK_TYPE,
  STUDENT_GUARDIAN_MODULE_ID,
  parseGuardianMetadata,
} from "./guardian-link.utils";

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  entityLink: ExtEntityLinkPort;
};

export class GetStudentGuardiansUseCase extends BaseUseCase<
  ListStudentGuardiansInput,
  ListStudentGuardiansOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListStudentGuardiansInput,
    ctx: UseCaseContext
  ): Promise<Result<ListStudentGuardiansOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const student = await this.useCaseDeps.partyRepo.findCustomerById(
      ctx.tenantId,
      input.studentId,
      "STUDENT"
    );
    if (!student) {
      return err(new NotFoundError("Student not found"));
    }

    const links = await this.useCaseDeps.entityLink.list({
      tenantId: ctx.tenantId,
      moduleId: STUDENT_GUARDIAN_MODULE_ID,
      toEntityType: PARTY_ENTITY_TYPE,
      toEntityId: input.studentId,
      linkType: STUDENT_GUARDIAN_LINK_TYPE,
    });

    const guardians = (
      await Promise.all(
        links.map(async (link) => {
          const guardian = await this.useCaseDeps.partyRepo.findPartyById(
            ctx.tenantId as string,
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

    return ok({ studentId: input.studentId, guardians });
  }
}

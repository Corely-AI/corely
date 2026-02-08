import {
  BaseUseCase,
  ok,
  type UseCaseContext,
  type Result,
  type LoggerPort,
  type UseCaseError,
} from "@corely/kernel";
import { type PartyRepoPort } from "../../../party/application/ports/party-repository.port";
import { type ExtEntityLinkPort } from "@corely/data";
import {
  STUDENT_GUARDIAN_MODULE_ID,
  STUDENT_GUARDIAN_LINK_TYPE,
  PARTY_ENTITY_TYPE,
} from "../../../party/application/use-cases/student-guardians/guardian-link.utils";

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  entityLink: ExtEntityLinkPort;
};

export class ResolveAccessibleStudentIdsUseCase extends BaseUseCase<string, string[]> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    userPartyId: string,
    ctx: UseCaseContext
  ): Promise<Result<string[], UseCaseError>> {
    if (!ctx.tenantId) {
      return ok([]);
    }

    const party = await this.useCaseDeps.partyRepo.findPartyById(ctx.tenantId, userPartyId);
    if (!party) {
      return ok([]);
    }

    const roles = party.roles;
    const studentIds: string[] = [];

    if (roles.includes("STUDENT")) {
      studentIds.push(userPartyId);
    }

    if (roles.includes("GUARDIAN")) {
      const links = await this.useCaseDeps.entityLink.list({
        tenantId: ctx.tenantId,
        moduleId: STUDENT_GUARDIAN_MODULE_ID,
        fromEntityType: PARTY_ENTITY_TYPE,
        fromEntityId: userPartyId,
        linkType: STUDENT_GUARDIAN_LINK_TYPE,
      });
      studentIds.push(...links.map((l) => l.toEntityId));
    }

    return ok([...new Set(studentIds)]);
  }
}

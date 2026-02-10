import {
  BaseUseCase,
  ok,
  err,
  NotFoundError,
  type UseCaseContext,
  type Result,
  type LoggerPort,
  type UseCaseError,
  isErr,
} from "@corely/kernel";
import { type UserRepositoryPort } from "../../../identity/application/ports/user-repository.port";
import { type PartyRepoPort } from "../../../party/application/ports/party-repository.port";
import { type ResolveAccessibleStudentIdsUseCase } from "./resolve-accessible-student-ids.usecase";

type Deps = {
  logger: LoggerPort;
  userRepo: UserRepositoryPort;
  partyRepo: PartyRepoPort;
  resolveStudents: ResolveAccessibleStudentIdsUseCase;
};

export class GetPortalMeUseCase extends BaseUseCase<void, any> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(_: void, ctx: UseCaseContext): Promise<Result<any, UseCaseError>> {
    if (!ctx.userId) {
      return err(new NotFoundError("User not found"));
    }

    const user = await this.useCaseDeps.userRepo.findById(ctx.userId);
    if (!user || !user.getPartyId()) {
      return err(new NotFoundError("User is not linked to any portal identity"));
    }

    const partyId = user.getPartyId()!;
    const party = await this.useCaseDeps.partyRepo.findPartyById(ctx.tenantId!, partyId);
    if (!party) {
      return err(new NotFoundError("Party not found"));
    }

    const accessibleStudentIdsResult = await this.useCaseDeps.resolveStudents.execute(partyId, ctx);
    if (isErr(accessibleStudentIdsResult)) {
      return err(accessibleStudentIdsResult.error);
    }

    const students = await Promise.all(
      accessibleStudentIdsResult.value.map(async (id) => {
        const p = await this.useCaseDeps.partyRepo.findPartyById(ctx.tenantId!, id);
        return { id, name: p?.displayName ?? "Unknown" };
      })
    );

    return ok({
      partyId,
      displayName: party.displayName,
      roles: party.roles,
      students,
    });
  }
}

import {
  BaseUseCase,
  ok,
  err,
  ForbiddenError,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  type LoggerPort,
  isErr,
} from "@corely/kernel";
import { type ClassesRepositoryPort } from "../../../classes/application/ports/classes-repository.port";
import { type ResolveAccessibleStudentIdsUseCase } from "./resolve-accessible-student-ids.usecase";
import { type UserRepositoryPort } from "../../../identity/application/ports/user-repository.port";

type Deps = {
  logger: LoggerPort;
  userRepo: UserRepositoryPort;
  resolveStudents: ResolveAccessibleStudentIdsUseCase;
  classesRepo: ClassesRepositoryPort;
};

export class GetStudentClassesUseCase extends BaseUseCase<{ studentId: string }, any> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: { studentId: string },
    ctx: UseCaseContext
  ): Promise<Result<any, UseCaseError>> {
    if (!ctx.userId || !ctx.tenantId || !ctx.workspaceId) {
      return err(new ForbiddenError("Context missing"));
    }

    const user = await this.useCaseDeps.userRepo.findById(ctx.userId);
    if (!user || !user.getPartyId()) {
      return err(new ForbiddenError("User not linked to party"));
    }

    const accessible = await this.useCaseDeps.resolveStudents.execute(user.getPartyId()!, ctx);
    if (isErr(accessible) || !accessible.value.includes(input.studentId)) {
      return err(new ForbiddenError("Access denied"));
    }

    const { items: enrollments } = await this.useCaseDeps.classesRepo.listEnrollments(
      ctx.tenantId,
      ctx.workspaceId,
      { studentClientId: input.studentId, isActive: true },
      { page: 1, pageSize: 100 }
    );

    const classes = await Promise.all(
      enrollments.map(async (e) => {
        const group = await this.useCaseDeps.classesRepo.findClassGroupById(
          ctx.tenantId!,
          ctx.workspaceId!,
          e.classGroupId
        );
        return {
          id: group?.id,
          name: group?.name,
          subject: group?.subject,
          level: group?.level,
        };
      })
    );

    return ok({ items: classes.filter((c) => Boolean(c.id)) });
  }
}

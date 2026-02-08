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
  isOk,
} from "@corely/kernel";
import { type ListLinkedDocumentsUseCase } from "../../../documents/application/use-cases/list-linked-documents/list-linked-documents.usecase";
import { type ClassesRepositoryPort } from "../../../classes/application/ports/classes-repository.port";
import { type ResolveAccessibleStudentIdsUseCase } from "./resolve-accessible-student-ids.usecase";
import { type UserRepositoryPort } from "../../../identity/application/ports/user-repository.port";

type Deps = {
  logger: LoggerPort;
  userRepo: UserRepositoryPort;
  resolveStudents: ResolveAccessibleStudentIdsUseCase;
  classesRepo: ClassesRepositoryPort;
  listDocuments: ListLinkedDocumentsUseCase;
};

export class GetStudentMaterialsUseCase extends BaseUseCase<{ studentId: string }, any> {
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

    const results: any[] = [];

    // 1. Personal docs
    const studentDocs = await this.useCaseDeps.listDocuments.execute(
      { entityType: "PARTY", entityId: input.studentId },
      ctx
    );
    if (isOk(studentDocs)) {
      results.push(...studentDocs.value.items.map((d) => ({ ...d, linkedTo: "STUDENT" })));
    }

    // 2. Class docs
    const { items: enrollments } = await this.useCaseDeps.classesRepo.listEnrollments(
      ctx.tenantId,
      ctx.workspaceId,
      { studentClientId: input.studentId, isActive: true },
      { page: 1, pageSize: 100 }
    );
    const classGroupIds = [...new Set(enrollments.map((e) => e.classGroupId))];

    for (const classGroupId of classGroupIds) {
      const classDocs = await this.useCaseDeps.listDocuments.execute(
        { entityType: "CLASS_GROUP", entityId: classGroupId },
        ctx
      );
      if (isOk(classDocs)) {
        results.push(...classDocs.value.items.map((d) => ({ ...d, linkedTo: "CLASS_GROUP" })));
      }
    }

    // 3. Session docs
    const { items: sessions } = await this.useCaseDeps.classesRepo.listSessions(
      ctx.tenantId,
      ctx.workspaceId,
      {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
      { page: 1, pageSize: 100 }
    );

    // Only sessions for the student's classes
    const relevantSessions = sessions.filter((s) => classGroupIds.includes(s.classGroupId));

    for (const session of relevantSessions) {
      const sessionDocs = await this.useCaseDeps.listDocuments.execute(
        { entityType: "CLASS_SESSION", entityId: session.id },
        ctx
      );
      if (isOk(sessionDocs)) {
        results.push(...sessionDocs.value.items.map((d) => ({ ...d, linkedTo: "CLASS_SESSION" })));
      }
    }

    return ok({ items: results });
  }
}

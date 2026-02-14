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
import { type InvoiceDto } from "@corely/contracts";
import { type ClassesRepositoryPort } from "../../../classes/application/ports/classes-repository.port";
import { type ResolveAccessibleStudentIdsUseCase } from "./resolve-accessible-student-ids.usecase";
import { type UserRepositoryPort } from "../../../identity/application/ports/user-repository.port";
import { type InvoicesApplication } from "../../../invoices/application/invoices.application";

type Deps = {
  logger: LoggerPort;
  userRepo: UserRepositoryPort;
  resolveStudents: ResolveAccessibleStudentIdsUseCase;
  classesRepo: ClassesRepositoryPort;
  invoicesApp: InvoicesApplication;
};

export class GetStudentInvoicesUseCase extends BaseUseCase<
  { studentId: string },
  { items: InvoiceDto[] }
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: { studentId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ items: InvoiceDto[] }, UseCaseError>> {
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

    const payerClientIds = [...new Set(enrollments.map((enrollment) => enrollment.payerClientId))];
    if (payerClientIds.length === 0) {
      return ok({ items: [] });
    }

    const invoicesById = new Map<string, InvoiceDto>();

    for (const payerClientId of payerClientIds) {
      let cursor: string | undefined = undefined;

      do {
        const invoices = await this.useCaseDeps.invoicesApp.listInvoices.execute(
          {
            customerPartyId: payerClientId,
            page: 1,
            pageSize: 100,
            cursor,
            sort: "issuedAt:desc",
          },
          ctx
        );

        if (isErr(invoices)) {
          return err(invoices.error);
        }

        for (const invoice of invoices.value.items) {
          invoicesById.set(invoice.id, invoice);
        }

        cursor = invoices.value.nextCursor ?? undefined;
      } while (cursor);
    }

    const items = [...invoicesById.values()].sort((a, b) => {
      const aDate = Date.parse(a.issuedAt ?? a.createdAt);
      const bDate = Date.parse(b.issuedAt ?? b.createdAt);
      return bDate - aDate;
    });

    return ok({ items });
  }
}

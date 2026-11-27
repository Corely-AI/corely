import { ForbiddenException, Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { DataModule } from "@corely/data";
import { AUDIT_PORT, UNIT_OF_WORK, type AuditPort, type UnitOfWorkPort } from "@corely/kernel";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { ResendAttachmentAdapter } from "../../shared/inbound-email/resend-attachment.adapter";
import { DocumentsModule } from "../documents";
import { EXPENSE_RECEIPT_DOCUMENTS, type ExpenseReceiptDocumentsPort } from "../documents/public";
import { IdentityModule } from "../identity";
import { GetWorkspacePermissionsUseCase } from "../identity/public";
import { WorkspacesModule } from "../workspaces";
import { WORKSPACE_REPOSITORY_PORT, type WorkspaceRepositoryPort } from "../workspaces/public";
import { ExpensesModule } from "./expenses.module";
import { ExpenseReceiptEmail } from "./application/expense-receipt-email";
import { expensePermissions } from "./application/expense-receipt-permissions";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.usecase";
import { TransitionExpenseUseCase } from "./application/use-cases/transition-expense.usecase";
import { ExpenseReceiptEmailController } from "./http/expense-receipt-email.controller";
import { ExpenseReceiptWebhookController } from "./http/expense-receipt-webhook.controller";
import { PrismaExpenseReceiptDraftStore } from "./infrastructure/adapters/prisma-expense-receipt-draft-store";

@Module({
  imports: [DataModule, DocumentsModule, IdentityModule, WorkspacesModule, ExpensesModule],
  controllers: [ExpenseReceiptEmailController, ExpenseReceiptWebhookController],
  providers: [
    PrismaExpenseReceiptDraftStore,
    ResendAttachmentAdapter,
    {
      provide: ExpenseReceiptEmail,
      useFactory: (
        store: PrismaExpenseReceiptDraftStore,
        unitOfWork: UnitOfWorkPort,
        audit: AuditPort,
        documents: ExpenseReceiptDocumentsPort,
        workspaces: WorkspaceRepositoryPort,
        permissions: GetWorkspacePermissionsUseCase,
        provider: ResendAttachmentAdapter,
        create: CreateExpenseUseCase,
        transition: TransitionExpenseUseCase,
        env: EnvService
      ) =>
        new ExpenseReceiptEmail({
          store,
          unitOfWork,
          audit,
          documents,
          log: new NestLoggerAdapter(),
          domain: env.RESEND_API_KEY ? env.getValue("EXPENSE_EMAIL_DOMAIN") : undefined,
          secret: env.getValue("EXPENSE_EMAIL_RESEND_WEBHOOK_SECRET"),
          tenantForWorkspace: (id) => workspaces.findActiveTenantForWorkspace(id),
          workspaceForSlug: async (slug) => {
            const workspace = await workspaces.getWorkspaceBySlug(slug);
            return workspace ? { tenantId: workspace.tenantId, workspaceId: workspace.id } : null;
          },
          canClaim: async (scope, userId) => {
            try {
              const result = await permissions.execute({ ...scope, userId });
              const access = expensePermissions(result.permissions);
              return access.read && access.write;
            } catch (error) {
              if (error instanceof ForbiddenException) {
                return false;
              }
              throw error;
            }
          },
          download: (emailId, attachmentId) => provider.download(emailId, attachmentId),
          submit: async (actor, input, tx) => {
            const expense = await create.createFromReceipt(input, actor, tx);
            await transition.submitFromReceipt(expense, actor, tx);
          },
        }),
      inject: [
        PrismaExpenseReceiptDraftStore,
        UNIT_OF_WORK,
        AUDIT_PORT,
        EXPENSE_RECEIPT_DOCUMENTS,
        WORKSPACE_REPOSITORY_PORT,
        GetWorkspacePermissionsUseCase,
        ResendAttachmentAdapter,
        CreateExpenseUseCase,
        TransitionExpenseUseCase,
        EnvService,
      ],
    },
  ],
})
export class ExpenseReceiptEmailModule {}

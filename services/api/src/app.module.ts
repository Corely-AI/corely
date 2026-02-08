import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { EnvModule } from "@corely/config";
import { DataModule } from "@corely/data";
import { AppController } from "./app.controller";
import { IdentityModule } from "./modules/identity";
import { ExpensesModule } from "./modules/expenses";
import { InvoicesModule } from "./modules/invoices";
import { WorkflowModule } from "./modules/workflow";
import { AutomationModule } from "./modules/automation";
import { ReportingModule } from "./modules/reporting";
import { TestHarnessModule } from "./modules/test-harness";
import { PartyModule } from "./modules/party";
import { CrmModule } from "./modules/crm";
import { DocumentsModule } from "./modules/documents";
import { TaxModule } from "./modules/tax/tax.module";
import { WorkspacesModule } from "./modules/workspaces";
import { AccountingModule } from "./modules/accounting";
import { SalesModule } from "./modules/sales";
import { PaymentMethodsModule } from "./modules/payment-methods/payment-methods.module";
import { PurchasingModule } from "./modules/purchasing";
import { InventoryModule } from "./modules/inventory";
import { ImportModule } from "./modules/import";
import { CatalogModule } from "./modules/catalog";
import { ApprovalsModule } from "./modules/approvals";
import { EngagementModule } from "./modules/engagement/engagement.module";
import { PlatformModule } from "./modules/platform";
import { PlatformEntitlementsModule } from "./modules/platform-entitlements/platform-entitlements.module";
import { AiCopilotModule } from "./modules/ai-copilot/ai-copilot.module";
import { CmsModule } from "./modules/cms";
import { FormsModule } from "./modules/forms";
import { RentalsModule } from "./modules/rentals";
import { PortfolioModule } from "./modules/portfolio";
import { IssuesModule } from "./modules/issues";
import { AiRichTextModule } from "./modules/ai-richtext";
import { WebsiteModule } from "./modules/website";
import { ClassesModule } from "./modules/classes";
import { PortalModule } from "./modules/portal/portal.module";
import { TraceIdMiddleware } from "./shared/trace/trace-id.middleware";
import { TraceIdService } from "./shared/trace/trace-id.service";
import { RequestContextInterceptor } from "./shared/request-context";
import { PublicWorkspacePathMiddleware, PublicWorkspaceResolver } from "./shared/public";

@Module({
  controllers: [AppController],
  providers: [
    TraceIdService,
    PublicWorkspaceResolver,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
  imports: [
    // Config must be first to validate env before other modules use it
    EnvModule.forRoot(),
    // DataModule must be imported for global providers (OUTBOX_PORT, AUDIT_PORT, etc.)
    DataModule,
    IdentityModule,
    PlatformModule,
    PlatformEntitlementsModule,
    PartyModule,
    CrmModule,
    WorkspacesModule,
    ExpensesModule,
    InvoicesModule,
    DocumentsModule,
    TaxModule,
    AccountingModule,
    SalesModule,
    PaymentMethodsModule,
    PurchasingModule,
    CatalogModule,
    InventoryModule,
    ImportModule,
    ApprovalsModule,
    EngagementModule,
    CmsModule,
    WebsiteModule,
    FormsModule,
    RentalsModule,
    ClassesModule,
    PortalModule,
    PortfolioModule,
    IssuesModule,
    WorkflowModule,
    AutomationModule,
    ReportingModule,
    // CustomizationModule,
    AiCopilotModule,
    AiRichTextModule,
    // Conditional imports based on env
    ...(function () {
      // We need to access EnvService here, but it's not available yet
      // Fall back to process.env for now (this is the only allowed usage)
      const isTest = process.env.NODE_ENV === "test";
      return isTest ? [TestHarnessModule] : [];
    })(),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PublicWorkspacePathMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL }); // <- important
  }
}

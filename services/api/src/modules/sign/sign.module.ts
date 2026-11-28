import {
  AcceptSignRequestUseCase,
  ArchiveSignTemplateUseCase,
  AttachSignTemplateSourceUseCase,
  CreateSignRequestDraftUseCase,
  DeclineSignRequestUseCase,
  DeliverSignInvitationUseCase,
  DownloadSignArtifactUseCase,
  EditSignRequestDraftUseCase,
  ExchangeSignInvitationUseCase,
  ExpireSignRequestsUseCase,
  FinalizeSignRequestUseCase,
  GetSignOverviewUseCase,
  GetSignRequestProgressUseCase,
  GetSignRequestUseCase,
  GetSignSettingsUseCase,
  GetSignTemplateUseCase,
  ListSignRequestsUseCase,
  ListSignTemplatesUseCase,
  PreviewSignAcceptanceUseCase,
  PublishSignTemplateUseCase,
  ReadSignRequestSourceUseCase,
  ReadSignTemplateSourceUseCase,
  RemindSignRecipientUseCase,
  RetrySignFinalizationUseCase,
  ReviewSignRequestUseCase,
  SaveRecipientProgressUseCase,
  SaveSignTemplateUseCase,
  SendSignRequestUseCase,
  VoidSignRequestUseCase,
} from "./application/use-cases";
import { RecipientSessionAccessService } from "./application/services/recipient-session-access.service";
import { SignRequestAccessService } from "./application/services/sign-request-access.service";
import { TemplateDraftAccessService } from "./application/services/template-draft-access.service";
import { TemplateRevisionWriter } from "./application/services/template-revision-writer.service";
import { CeremonyTransitionsService } from "./application/services/ceremony-transitions.service";
import { SignAccessService } from "./application/services/sign-access.service";
import { SignArtifactEngine } from "./application/ports/sign-artifact-engine";
import { PdfArtifactEngine } from "./infrastructure/pdf/pdf-artifact-engine";
import {
  ManageCeremonyController,
  PublicCeremonyController,
} from "./adapters/http/sign-ceremony.controller";
import { CeremonyRepository } from "./application/ports/ceremony.repository";
import { PrismaCeremonyRepository } from "./infrastructure/persistence/prisma-ceremony.repository";
import { SigningRateGuard } from "./adapters/http/signing-rate.guard";
import { invitationSecrets } from "./infrastructure/invitation-vault";
import { InvitationSecrets } from "./application/ports/invitation-secrets";
import { SignRequestsController } from "./adapters/http/sign-requests.controller";
import { SignOverviewController } from "./adapters/http/sign-overview.controller";
import { SignConfiguration } from "./application/ports/sign-configuration";
import { RuntimeSignConfiguration } from "./infrastructure/sign-configuration";
import { RequestDraftRepository } from "./application/ports/request-draft.repository";
import { PrismaRequestDraftRepository } from "./infrastructure/persistence/prisma-request-draft.repository";
import { TemplatePdfInspector } from "./application/ports/template-pdf-inspector";
import { inspectTemplatePdf } from "./infrastructure/pdf/inspect-template-pdf";
import { DocumentsModule } from "../documents/documents.module";
import { Module, forwardRef } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity/identity.module";
import { PlatformModule } from "../platform/platform.module";
import { SignDraftRepository } from "./application/ports/sign-draft.repository";
import { PrismaSignDraftRepository } from "./infrastructure/persistence/prisma-sign-draft.repository";
import { SignTemplatesController } from "./adapters/http/sign-templates.controller";
import { CoachingSignRequestLinksModule } from "../coaching-engagements/public/sign-request-links";
@Module({
  imports: [
    WorkspacesModule,
    DocumentsModule,
    DataModule,
    CoachingSignRequestLinksModule,
    forwardRef(() => IdentityModule),
    forwardRef(() => PlatformModule),
  ],
  exports: [
    CreateSignRequestDraftUseCase,
    DeliverSignInvitationUseCase,
    ExpireSignRequestsUseCase,
    FinalizeSignRequestUseCase,
  ],
  controllers: [
    SignOverviewController,
    ManageCeremonyController,
    PublicCeremonyController,
    SignTemplatesController,
    SignRequestsController,
  ],
  providers: [
    SignAccessService,
    AcceptSignRequestUseCase,
    ArchiveSignTemplateUseCase,
    AttachSignTemplateSourceUseCase,
    CreateSignRequestDraftUseCase,
    DeclineSignRequestUseCase,
    DeliverSignInvitationUseCase,
    DownloadSignArtifactUseCase,
    EditSignRequestDraftUseCase,
    ExchangeSignInvitationUseCase,
    ExpireSignRequestsUseCase,
    FinalizeSignRequestUseCase,
    GetSignOverviewUseCase,
    GetSignRequestProgressUseCase,
    GetSignRequestUseCase,
    GetSignSettingsUseCase,
    GetSignTemplateUseCase,
    ListSignRequestsUseCase,
    ListSignTemplatesUseCase,
    PreviewSignAcceptanceUseCase,
    PublishSignTemplateUseCase,
    ReadSignRequestSourceUseCase,
    ReadSignTemplateSourceUseCase,
    RecipientSessionAccessService,
    RemindSignRecipientUseCase,
    RetrySignFinalizationUseCase,
    ReviewSignRequestUseCase,
    SaveRecipientProgressUseCase,
    SaveSignTemplateUseCase,
    SendSignRequestUseCase,
    SignRequestAccessService,
    TemplateDraftAccessService,
    TemplateRevisionWriter,
    VoidSignRequestUseCase,
    CeremonyTransitionsService,
    { provide: SignConfiguration, useClass: RuntimeSignConfiguration },
    SigningRateGuard,
    { provide: InvitationSecrets, useValue: invitationSecrets },
    { provide: SignArtifactEngine, useClass: PdfArtifactEngine },
    { provide: CeremonyRepository, useClass: PrismaCeremonyRepository },
    { provide: RequestDraftRepository, useClass: PrismaRequestDraftRepository },
    { provide: TemplatePdfInspector, useValue: { pageCount: inspectTemplatePdf } },
    { provide: SignDraftRepository, useClass: PrismaSignDraftRepository },
  ],
})
export class SignModule {}

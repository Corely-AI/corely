import { Module, forwardRef } from "@nestjs/common";
import { DataModule, PrismaService } from "@corely/data";
import { EnvService } from "@corely/config";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { PortalController } from "./http/portal.controller";
import { PortalAuthController } from "./http/portal-auth.controller";
import { PortalApplication } from "./application/portal.application";
import { GetPortalMeUseCase } from "./application/use-cases/get-portal-me.usecase";
import { GetStudentClassesUseCase } from "./application/use-cases/get-student-classes.usecase";
import { GetStudentMaterialsUseCase } from "./application/use-cases/get-student-materials.usecase";
import { GetPortalDownloadUrlUseCase } from "./application/use-cases/get-portal-download-url.usecase";
import { ResolveAccessibleStudentIdsUseCase } from "./application/use-cases/resolve-accessible-student-ids.usecase";
import { InvitePortalUserUseCase } from "./application/use-cases/invite-portal-user.usecase";
import { PortalRequestCodeUseCase } from "./application/use-cases/portal-request-code.usecase";
import { PortalVerifyCodeUseCase } from "./application/use-cases/portal-verify-code.usecase";
import { PortalRefreshUseCase } from "./application/use-cases/portal-refresh.usecase";
import { PortalLogoutUseCase } from "./application/use-cases/portal-logout.usecase";
import { IdentityModule } from "../identity";
import { PartyModule } from "../party";
import { ClassesModule } from "../classes";
import { DocumentsModule } from "../documents";
import { PrismaUserRepository } from "../identity/infrastructure/adapters/prisma-user-repository.adapter";
import { PrismaPartyRepoAdapter } from "../party/infrastructure/prisma/prisma-party-repo.adapter";
import { PrismaClassesRepository } from "../classes/infrastructure/prisma/classes.repository";
import { PrismaRoleRepository } from "../identity/infrastructure/adapters/prisma-role-repository.adapter";
import { PrismaMembershipRepository } from "../identity/infrastructure/adapters/prisma-membership-repository.adapter";
import { ListLinkedDocumentsUseCase } from "../documents/application/use-cases/list-linked-documents/list-linked-documents.usecase";
import { GetDownloadUrlUseCase } from "../documents/application/use-cases/get-download-url/get-download-url.usecase";
import { EXT_ENTITY_LINK_PORT, type ExtEntityLinkPort } from "@corely/data";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "../../shared/ports/id-generator.port";
import {
  PASSWORD_HASHER_TOKEN,
  type PasswordHasherPort,
} from "../identity/application/ports/password-hasher.port";
import { TOKEN_SERVICE_TOKEN } from "../identity/application/ports/token-service.port";
import type { TokenServicePort } from "../identity/application/ports/token-service.port";
import { AUDIT_PORT_TOKEN } from "../identity/application/ports/audit.port";
import type { AuditPort } from "../identity/application/ports/audit.port";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { PrismaPortalOtpRepository } from "./infrastructure/prisma-portal-otp-repository.adapter";
import { PrismaPortalSessionRepository } from "./infrastructure/prisma-portal-session-repository.adapter";
import { PORTAL_OTP_REPOSITORY_TOKEN } from "./application/ports/portal-otp.port";
import { PORTAL_SESSION_REPOSITORY_TOKEN } from "./application/ports/portal-session.port";
import { PORTAL_EMAIL_PORT, type PortalEmailPort } from "./application/ports/portal-email.port";
import { ResendPortalEmailAdapter } from "./infrastructure/resend-portal-email.adapter";
import { PublicWorkspaceResolver } from "../../shared/public";
import { PlatformModule } from "../platform";
import { WorkspacesModule } from "../workspaces";

@Module({
  imports: [
    DataModule,
    KernelModule,
    IdentityModule,
    PartyModule,
    ClassesModule,
    DocumentsModule,
    // Required for RbacGuard (used in portal invitations endpoint)
    forwardRef(() => PlatformModule),
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [PortalController, PortalAuthController],
  providers: [
    // Infrastructure adapters
    PrismaPortalOtpRepository,
    PrismaPortalSessionRepository,
    PublicWorkspaceResolver,

    // Port bindings
    {
      provide: PORTAL_OTP_REPOSITORY_TOKEN,
      useExisting: PrismaPortalOtpRepository,
    },
    {
      provide: PORTAL_SESSION_REPOSITORY_TOKEN,
      useExisting: PrismaPortalSessionRepository,
    },
    {
      provide: PORTAL_EMAIL_PORT,
      useFactory: (env: EnvService) => {
        const provider = env.EMAIL_PROVIDER;
        if (provider !== "resend") {
          throw new Error(`Unsupported email provider for portal: ${provider}`);
        }
        return new ResendPortalEmailAdapter(
          env.RESEND_API_KEY,
          env.RESEND_FROM,
          env.RESEND_REPLY_TO
        );
      },
      inject: [EnvService],
    },

    // Portal Auth Use Cases
    {
      provide: PortalRequestCodeUseCase,
      useFactory: (
        otpRepo: PrismaPortalOtpRepository,
        emailSender: ResendPortalEmailAdapter,
        audit: AuditPort,
        prisma: PrismaService,
        idGenerator: IdGeneratorPort
      ) => new PortalRequestCodeUseCase(otpRepo, emailSender, audit, prisma, idGenerator),
      inject: [
        PrismaPortalOtpRepository,
        PORTAL_EMAIL_PORT,
        AUDIT_PORT_TOKEN,
        PrismaService,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: PortalVerifyCodeUseCase,
      useFactory: (
        otpRepo: PrismaPortalOtpRepository,
        sessionRepo: PrismaPortalSessionRepository,
        tokenService: TokenServicePort,
        audit: AuditPort,
        prisma: PrismaService,
        idGenerator: IdGeneratorPort
      ) =>
        new PortalVerifyCodeUseCase(otpRepo, sessionRepo, tokenService, audit, prisma, idGenerator),
      inject: [
        PrismaPortalOtpRepository,
        PrismaPortalSessionRepository,
        TOKEN_SERVICE_TOKEN,
        AUDIT_PORT_TOKEN,
        PrismaService,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: PortalRefreshUseCase,
      useFactory: (
        sessionRepo: PrismaPortalSessionRepository,
        tokenService: TokenServicePort,
        audit: AuditPort,
        prisma: PrismaService,
        idGenerator: IdGeneratorPort
      ) => new PortalRefreshUseCase(sessionRepo, tokenService, audit, prisma, idGenerator),
      inject: [
        PrismaPortalSessionRepository,
        TOKEN_SERVICE_TOKEN,
        AUDIT_PORT_TOKEN,
        PrismaService,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: PortalLogoutUseCase,
      useFactory: (sessionRepo: PrismaPortalSessionRepository, audit: AuditPort) =>
        new PortalLogoutUseCase(sessionRepo, audit),
      inject: [PrismaPortalSessionRepository, AUDIT_PORT_TOKEN],
    },

    // Existing portal use cases
    {
      provide: ResolveAccessibleStudentIdsUseCase,
      useFactory: (partyRepo: PrismaPartyRepoAdapter, entityLink: ExtEntityLinkPort) =>
        new ResolveAccessibleStudentIdsUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo,
          entityLink,
        }),
      inject: [PrismaPartyRepoAdapter, EXT_ENTITY_LINK_PORT],
    },
    {
      provide: GetPortalMeUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        partyRepo: PrismaPartyRepoAdapter,
        resolveStudents: ResolveAccessibleStudentIdsUseCase
      ) =>
        new GetPortalMeUseCase({
          logger: new NestLoggerAdapter(),
          userRepo,
          partyRepo,
          resolveStudents,
        }),
      inject: [PrismaUserRepository, PrismaPartyRepoAdapter, ResolveAccessibleStudentIdsUseCase],
    },
    {
      provide: GetStudentClassesUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        resolveStudents: ResolveAccessibleStudentIdsUseCase,
        classesRepo: PrismaClassesRepository
      ) =>
        new GetStudentClassesUseCase({
          logger: new NestLoggerAdapter(),
          userRepo,
          resolveStudents,
          classesRepo,
        }),
      inject: [PrismaUserRepository, ResolveAccessibleStudentIdsUseCase, PrismaClassesRepository],
    },
    {
      provide: GetStudentMaterialsUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        resolveStudents: ResolveAccessibleStudentIdsUseCase,
        classesRepo: PrismaClassesRepository,
        listDocuments: ListLinkedDocumentsUseCase
      ) =>
        new GetStudentMaterialsUseCase({
          logger: new NestLoggerAdapter(),
          userRepo,
          resolveStudents,
          classesRepo,
          listDocuments,
        }),
      inject: [
        PrismaUserRepository,
        ResolveAccessibleStudentIdsUseCase,
        PrismaClassesRepository,
        ListLinkedDocumentsUseCase,
      ],
    },
    {
      provide: GetPortalDownloadUrlUseCase,
      useFactory: (
        getDownloadUrl: GetDownloadUrlUseCase,
        getStudentMaterials: GetStudentMaterialsUseCase
      ) =>
        new GetPortalDownloadUrlUseCase({
          logger: new NestLoggerAdapter(),
          getDownloadUrl,
          getStudentMaterials,
        }),
      inject: [GetDownloadUrlUseCase, GetStudentMaterialsUseCase],
    },
    {
      provide: InvitePortalUserUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        partyRepo: PrismaPartyRepoAdapter,
        roleRepo: PrismaRoleRepository,
        membershipRepo: PrismaMembershipRepository,
        idGenerator: IdGeneratorPort,
        passwordHasher: PasswordHasherPort,
        emailSender: PortalEmailPort,
        prisma: PrismaService
      ) =>
        new InvitePortalUserUseCase({
          logger: new NestLoggerAdapter(),
          userRepo,
          partyRepo,
          roleRepo,
          membershipRepo,
          idGenerator,
          passwordHasher,
          emailSender,
          prisma,
        }),
      inject: [
        PrismaUserRepository,
        PrismaPartyRepoAdapter,
        PrismaRoleRepository,
        PrismaMembershipRepository,
        ID_GENERATOR_TOKEN,
        PASSWORD_HASHER_TOKEN,
        PORTAL_EMAIL_PORT,
        PrismaService,
      ],
    },
    {
      provide: PortalApplication,
      useFactory: (
        getMe: GetPortalMeUseCase,
        getStudentClasses: GetStudentClassesUseCase,
        getStudentMaterials: GetStudentMaterialsUseCase,
        getDownloadUrl: GetPortalDownloadUrlUseCase,
        inviteUser: InvitePortalUserUseCase
      ) =>
        new PortalApplication(
          getMe,
          getStudentClasses,
          getStudentMaterials,
          getDownloadUrl,
          inviteUser
        ),
      inject: [
        GetPortalMeUseCase,
        GetStudentClassesUseCase,
        GetStudentMaterialsUseCase,
        GetPortalDownloadUrlUseCase,
        InvitePortalUserUseCase,
      ],
    },
  ],
})
export class PortalModule {}

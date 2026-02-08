import { Module } from "@nestjs/common";
import { PortalController } from "./http/portal.controller";
import { PortalApplication } from "./application/portal.application";
import { GetPortalMeUseCase } from "./application/use-cases/get-portal-me.usecase";
import { GetStudentClassesUseCase } from "./application/use-cases/get-student-classes.usecase";
import { GetStudentMaterialsUseCase } from "./application/use-cases/get-student-materials.usecase";
import { GetPortalDownloadUrlUseCase } from "./application/use-cases/get-portal-download-url.usecase";
import { ResolveAccessibleStudentIdsUseCase } from "./application/use-cases/resolve-accessible-student-ids.usecase";
import { InvitePortalUserUseCase } from "./application/use-cases/invite-portal-user.usecase";
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
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";

@Module({
  imports: [IdentityModule, PartyModule, ClassesModule, DocumentsModule],
  controllers: [PortalController],
  providers: [
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
        passwordHasher: PasswordHasherPort
      ) =>
        new InvitePortalUserUseCase({
          logger: new NestLoggerAdapter(),
          userRepo,
          partyRepo,
          roleRepo,
          membershipRepo,
          idGenerator,
          passwordHasher,
        }),
      inject: [
        PrismaUserRepository,
        PrismaPartyRepoAdapter,
        PrismaRoleRepository,
        PrismaMembershipRepository,
        ID_GENERATOR_TOKEN,
        PASSWORD_HASHER_TOKEN,
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

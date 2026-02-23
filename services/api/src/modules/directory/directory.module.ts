import { Module, forwardRef } from "@nestjs/common";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type OutboxPort,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { DataModule } from "@corely/data";
import { KernelModule } from "@/shared/kernel/kernel.module";
import { IdempotencyService } from "@/shared/infrastructure/idempotency/idempotency.service";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { WorkspacesModule } from "../workspaces";
import { DirectoryPublicScopeResolver } from "./application/directory-public-scope.resolver";
import {
  DIRECTORY_REPOSITORY_PORT,
  type DirectoryRepositoryPort,
} from "./application/ports/directory-repository.port";
import { AdminCreateRestaurantCommandUseCase } from "./application/use-cases/admin-create-restaurant-command.usecase";
import { AdminGetRestaurantByIdQueryUseCase } from "./application/use-cases/admin-get-restaurant-by-id-query.usecase";
import { AdminListRestaurantsQueryUseCase } from "./application/use-cases/admin-list-restaurants-query.usecase";
import { AdminSetRestaurantStatusCommandUseCase } from "./application/use-cases/admin-set-restaurant-status-command.usecase";
import { AdminUpdateRestaurantCommandUseCase } from "./application/use-cases/admin-update-restaurant-command.usecase";
import { CreateLeadCommandUseCase } from "./application/use-cases/create-lead-command.usecase";
import { GetRestaurantBySlugQueryUseCase } from "./application/use-cases/get-restaurant-by-slug-query.usecase";
import { ListRestaurantsQueryUseCase } from "./application/use-cases/list-restaurants-query.usecase";
import { AdminDirectoryController } from "./http/admin-directory.controller";
import { PublicDirectoryController } from "./http/public-directory.controller";
import { PrismaDirectoryRepositoryAdapter } from "./infrastructure/prisma-directory-repository.adapter";

@Module({
  imports: [
    DataModule,
    KernelModule,
    IdentityModule,
    // Required for RbacGuard dependencies in admin endpoints.
    forwardRef(() => PlatformModule),
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [PublicDirectoryController, AdminDirectoryController],
  providers: [
    PrismaDirectoryRepositoryAdapter,
    { provide: DIRECTORY_REPOSITORY_PORT, useExisting: PrismaDirectoryRepositoryAdapter },
    DirectoryPublicScopeResolver,
    IdempotencyService,
    {
      provide: AdminListRestaurantsQueryUseCase,
      useFactory: (repo: DirectoryRepositoryPort) => new AdminListRestaurantsQueryUseCase(repo),
      inject: [DIRECTORY_REPOSITORY_PORT],
    },
    {
      provide: AdminGetRestaurantByIdQueryUseCase,
      useFactory: (repo: DirectoryRepositoryPort) => new AdminGetRestaurantByIdQueryUseCase(repo),
      inject: [DIRECTORY_REPOSITORY_PORT],
    },
    {
      provide: AdminCreateRestaurantCommandUseCase,
      useFactory: (
        repo: DirectoryRepositoryPort,
        uow: UnitOfWorkPort,
        idempotency: IdempotencyService,
        audit: AuditPort
      ) => new AdminCreateRestaurantCommandUseCase(repo, uow, idempotency, audit),
      inject: [DIRECTORY_REPOSITORY_PORT, UNIT_OF_WORK, IdempotencyService, AUDIT_PORT],
    },
    {
      provide: AdminUpdateRestaurantCommandUseCase,
      useFactory: (repo: DirectoryRepositoryPort, uow: UnitOfWorkPort, audit: AuditPort) =>
        new AdminUpdateRestaurantCommandUseCase(repo, uow, audit),
      inject: [DIRECTORY_REPOSITORY_PORT, UNIT_OF_WORK, AUDIT_PORT],
    },
    {
      provide: AdminSetRestaurantStatusCommandUseCase,
      useFactory: (repo: DirectoryRepositoryPort, uow: UnitOfWorkPort, audit: AuditPort) =>
        new AdminSetRestaurantStatusCommandUseCase(repo, uow, audit),
      inject: [DIRECTORY_REPOSITORY_PORT, UNIT_OF_WORK, AUDIT_PORT],
    },
    {
      provide: ListRestaurantsQueryUseCase,
      useFactory: (repo: DirectoryRepositoryPort) => new ListRestaurantsQueryUseCase(repo),
      inject: [DIRECTORY_REPOSITORY_PORT],
    },
    {
      provide: GetRestaurantBySlugQueryUseCase,
      useFactory: (repo: DirectoryRepositoryPort) => new GetRestaurantBySlugQueryUseCase(repo),
      inject: [DIRECTORY_REPOSITORY_PORT],
    },
    {
      provide: CreateLeadCommandUseCase,
      useFactory: (
        repo: DirectoryRepositoryPort,
        outbox: OutboxPort,
        uow: UnitOfWorkPort,
        idempotency: IdempotencyService
      ) => new CreateLeadCommandUseCase(repo, outbox, uow, idempotency),
      inject: [DIRECTORY_REPOSITORY_PORT, OUTBOX_PORT, UNIT_OF_WORK, IdempotencyService],
    },
  ],
  exports: [
    AdminListRestaurantsQueryUseCase,
    AdminGetRestaurantByIdQueryUseCase,
    AdminCreateRestaurantCommandUseCase,
    AdminUpdateRestaurantCommandUseCase,
    AdminSetRestaurantStatusCommandUseCase,
    ListRestaurantsQueryUseCase,
    GetRestaurantBySlugQueryUseCase,
    CreateLeadCommandUseCase,
    DIRECTORY_REPOSITORY_PORT,
  ],
})
export class DirectoryModule {}

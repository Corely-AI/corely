import { Module } from "@nestjs/common";
import {
  DataModule,
  EXT_ENTITY_LINK_PORT,
  type ExtEntityLinkPort,
  PrismaService,
} from "@corely/data";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { CustomersHttpController } from "./adapters/http/customers.controller";
import { PartyInternalController } from "./adapters/http/party-internal.controller";
import { PrismaPartyRepoAdapter } from "./infrastructure/prisma/prisma-party-repo.adapter";
import { PrismaCustomerQueryAdapter } from "./infrastructure/prisma/prisma-customer-query.adapter";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { AUDIT_PORT, type AuditPort } from "../../shared/ports/audit.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "../../shared/ports/idempotency-storage.port";
import { PartyApplication } from "./application/party.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { CUSTOMER_QUERY_PORT } from "./application/ports/customer-query.port";
import { ArchiveCustomerUseCase } from "./application/use-cases/archive-customer/archive-customer.usecase";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer/create-customer.usecase";
import { GetCustomerByIdUseCase } from "./application/use-cases/get-customer-by-id/get-customer-by-id.usecase";
import { ListCustomersUseCase } from "./application/use-cases/list-customers/list-customers.usecase";
import { SearchCustomersUseCase } from "./application/use-cases/search-customers/search-customers.usecase";
import { UnarchiveCustomerUseCase } from "./application/use-cases/unarchive-customer/unarchive-customer.usecase";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer/update-customer.usecase";
import { GetStudentGuardiansUseCase } from "./application/use-cases/student-guardians/get-student-guardians.usecase";
import { LinkGuardianToStudentUseCase } from "./application/use-cases/student-guardians/link-guardian-to-student.usecase";
import { SetPrimaryPayerUseCase } from "./application/use-cases/student-guardians/set-primary-payer.usecase";
import { UnlinkGuardianUseCase } from "./application/use-cases/student-guardians/unlink-guardian.usecase";
import { CreateTutoringLeadUseCase } from "./application/use-cases/create-tutoring-lead.usecase";
import { UpdatePartyLifecycleStatusUseCase } from "./application/use-cases/update-party-lifecycle-status.usecase";
import { PARTY_QUERY_PORT } from "./application/ports/party-query.port";
import { PrismaPartyQueryAdapter } from "./infrastructure/prisma/prisma-party-query.adapter";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule],
  controllers: [CustomersHttpController, PartyInternalController],
  providers: [
    PrismaPartyRepoAdapter,
    PrismaCustomerQueryAdapter,
    PrismaPartyQueryAdapter,
    { provide: CUSTOMER_QUERY_PORT, useExisting: PrismaCustomerQueryAdapter },
    { provide: PARTY_QUERY_PORT, useExisting: PrismaPartyQueryAdapter },
    {
      provide: CreateCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, idGen: any, clock: any) =>
        new CreateCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          idGenerator: idGen,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: UpdateCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, idGen: any, clock: any) =>
        new UpdateCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          idGenerator: idGen,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: ArchiveCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, clock: any) =>
        new ArchiveCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: UnarchiveCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, clock: any) =>
        new UnarchiveCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: GetCustomerByIdUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter) =>
        new GetCustomerByIdUseCase({ logger: new NestLoggerAdapter(), partyRepo: repo }),
      inject: [PrismaPartyRepoAdapter],
    },
    {
      provide: ListCustomersUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter) =>
        new ListCustomersUseCase({ logger: new NestLoggerAdapter(), partyRepo: repo }),
      inject: [PrismaPartyRepoAdapter],
    },
    {
      provide: SearchCustomersUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter) =>
        new SearchCustomersUseCase({ logger: new NestLoggerAdapter(), partyRepo: repo }),
      inject: [PrismaPartyRepoAdapter],
    },
    {
      provide: GetStudentGuardiansUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, entityLink: ExtEntityLinkPort) =>
        new GetStudentGuardiansUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          entityLink,
        }),
      inject: [PrismaPartyRepoAdapter, EXT_ENTITY_LINK_PORT],
    },
    {
      provide: LinkGuardianToStudentUseCase,
      useFactory: (
        repo: PrismaPartyRepoAdapter,
        entityLink: ExtEntityLinkPort,
        idempotency: IdempotencyStoragePort,
        audit: AuditPort
      ) =>
        new LinkGuardianToStudentUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          entityLink,
          idempotency,
          audit,
        }),
      inject: [
        PrismaPartyRepoAdapter,
        EXT_ENTITY_LINK_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: UnlinkGuardianUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, entityLink: ExtEntityLinkPort, audit: AuditPort) =>
        new UnlinkGuardianUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          entityLink,
          audit,
        }),
      inject: [PrismaPartyRepoAdapter, EXT_ENTITY_LINK_PORT, AUDIT_PORT],
    },
    {
      provide: SetPrimaryPayerUseCase,
      useFactory: (
        repo: PrismaPartyRepoAdapter,
        entityLink: ExtEntityLinkPort,
        idempotency: IdempotencyStoragePort,
        audit: AuditPort
      ) =>
        new SetPrimaryPayerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          entityLink,
          idempotency,
          audit,
        }),
      inject: [
        PrismaPartyRepoAdapter,
        EXT_ENTITY_LINK_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        AUDIT_PORT,
      ],
    },
    {
      provide: PartyApplication,
      useFactory: (
        createCustomer: CreateCustomerUseCase,
        updateCustomer: UpdateCustomerUseCase,
        archiveCustomer: ArchiveCustomerUseCase,
        unarchiveCustomer: UnarchiveCustomerUseCase,
        getCustomerById: GetCustomerByIdUseCase,
        listCustomers: ListCustomersUseCase,
        searchCustomers: SearchCustomersUseCase,
        getStudentGuardians: GetStudentGuardiansUseCase,
        linkGuardianToStudent: LinkGuardianToStudentUseCase,
        unlinkGuardian: UnlinkGuardianUseCase,
        setPrimaryPayer: SetPrimaryPayerUseCase,
        updateLifecycleStatus: UpdatePartyLifecycleStatusUseCase
      ) =>
        new PartyApplication(
          createCustomer,
          updateCustomer,
          archiveCustomer,
          unarchiveCustomer,
          getCustomerById,
          listCustomers,
          searchCustomers,
          getStudentGuardians,
          linkGuardianToStudent,
          unlinkGuardian,
          setPrimaryPayer,
          updateLifecycleStatus
        ),
      inject: [
        CreateCustomerUseCase,
        UpdateCustomerUseCase,
        ArchiveCustomerUseCase,
        UnarchiveCustomerUseCase,
        GetCustomerByIdUseCase,
        ListCustomersUseCase,
        SearchCustomersUseCase,
        GetStudentGuardiansUseCase,
        LinkGuardianToStudentUseCase,
        UnlinkGuardianUseCase,
        SetPrimaryPayerUseCase,
        UpdatePartyLifecycleStatusUseCase,
      ],
    },
    {
      provide: UpdatePartyLifecycleStatusUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, audit: AuditPort, prisma: PrismaService) =>
        new UpdatePartyLifecycleStatusUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          audit,
          prisma,
        }),
      inject: [PrismaPartyRepoAdapter, AUDIT_PORT, PrismaService],
    },
    {
      provide: CreateTutoringLeadUseCase,
      useFactory: (
        repo: PrismaPartyRepoAdapter,
        idGen: any,
        clock: any,
        audit: AuditPort,
        linkGuardianToStudent: LinkGuardianToStudentUseCase
      ) =>
        new CreateTutoringLeadUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          idGenerator: idGen,
          clock,
          audit,
          linkGuardianToStudent,
        }),
      inject: [
        PrismaPartyRepoAdapter,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AUDIT_PORT,
        LinkGuardianToStudentUseCase,
      ],
    },
  ],
  exports: [PartyApplication, CUSTOMER_QUERY_PORT, PARTY_QUERY_PORT],
})
export class PartyModule {}

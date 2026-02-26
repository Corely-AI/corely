import { Module, forwardRef } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { PosController } from "./adapters/http/pos.controller";
import { CreateRegisterUseCase } from "./application/use-cases/create-register.usecase";
import { ListRegistersUseCase } from "./application/use-cases/list-registers.usecase";
import { OpenShiftUseCase } from "./application/use-cases/open-shift.usecase";
import { CloseShiftUseCase } from "./application/use-cases/close-shift.usecase";
import { GetCurrentShiftUseCase } from "./application/use-cases/get-current-shift.usecase";
import { SyncPosSaleUseCase } from "./application/use-cases/sync-pos-sale.usecase";
import { GetCatalogSnapshotUseCase } from "./application/use-cases/get-catalog-snapshot.usecase";
import { StartCashlessPaymentUseCase } from "./application/use-cases/start-cashless-payment.usecase";
import { GetCashlessPaymentStatusUseCase } from "./application/use-cases/get-cashless-payment-status.usecase";
import { PrismaRegisterRepositoryAdapter } from "./infrastructure/adapters/prisma-register-repository.adapter";
import { PrismaShiftSessionRepositoryAdapter } from "./infrastructure/adapters/prisma-shift-session-repository.adapter";
import { PrismaPosSaleIdempotencyAdapter } from "./infrastructure/adapters/prisma-pos-sale-idempotency.adapter";
import { PrismaPaymentAttemptRepositoryAdapter } from "./infrastructure/adapters/prisma-payment-attempt-repository.adapter";
import { REGISTER_REPOSITORY_PORT } from "./application/ports/register-repository.port";
import { SHIFT_SESSION_REPOSITORY_PORT } from "./application/ports/shift-session-repository.port";
import { POS_SALE_IDEMPOTENCY_PORT } from "./application/ports/pos-sale-idempotency.port";
import { PAYMENT_ATTEMPT_REPOSITORY_PORT } from "./application/ports/payment-attempt-repository.port";
import { CASHLESS_GATEWAY_PORT } from "./application/ports/cashless-gateway.port";
import { CASHLESS_PAYMENT_UPDATE_PORT } from "./application/ports/cashless-payment-update.port";
import { CashlessPaymentUpdaterService } from "./application/services/cashless-payment-updater.service";
import { IntegrationsCashlessGatewayService } from "../integrations";

import { CashManagementModule } from "../cash-management/cash-management.module";
import { IntegrationsModule } from "../integrations";

@Module({
  imports: [
    DataModule,
    KernelModule,
    IdentityModule,
    CashManagementModule,
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [PosController],
  providers: [
    // Infrastructure adapters
    PrismaRegisterRepositoryAdapter,
    PrismaShiftSessionRepositoryAdapter,
    PrismaPosSaleIdempotencyAdapter,
    PrismaPaymentAttemptRepositoryAdapter,
    CashlessPaymentUpdaterService,

    // Port bindings
    { provide: REGISTER_REPOSITORY_PORT, useExisting: PrismaRegisterRepositoryAdapter },
    { provide: SHIFT_SESSION_REPOSITORY_PORT, useExisting: PrismaShiftSessionRepositoryAdapter },
    { provide: POS_SALE_IDEMPOTENCY_PORT, useExisting: PrismaPosSaleIdempotencyAdapter },
    {
      provide: PAYMENT_ATTEMPT_REPOSITORY_PORT,
      useExisting: PrismaPaymentAttemptRepositoryAdapter,
    },
    { provide: CASHLESS_PAYMENT_UPDATE_PORT, useExisting: CashlessPaymentUpdaterService },
    { provide: CASHLESS_GATEWAY_PORT, useExisting: IntegrationsCashlessGatewayService },

    // Use cases
    CreateRegisterUseCase,
    ListRegistersUseCase,
    OpenShiftUseCase,
    CloseShiftUseCase,
    GetCurrentShiftUseCase,
    SyncPosSaleUseCase,
    GetCatalogSnapshotUseCase,
    StartCashlessPaymentUseCase,
    GetCashlessPaymentStatusUseCase,
  ],
  exports: [CASHLESS_PAYMENT_UPDATE_PORT],
})
export class PosModule {}

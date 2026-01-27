import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { CashManagementController } from "./infrastructure/http/cash-management.controller";
import { CreateRegisterUseCase } from "./application/use-cases/create-register.usecase";
import { AddEntryUseCase } from "./application/use-cases/add-entry.usecase";
import { ReverseEntryUseCase } from "./application/use-cases/reverse-entry.usecase";
import { SubmitDailyCloseUseCase } from "./application/use-cases/submit-daily-close.usecase";
import { PrismaCashRepository } from "./infrastructure/adapters/prisma-cash-repository.adapter";
import { CASH_REPOSITORY } from "./application/ports/cash-repository.port";

import { KernelModule } from "../../shared/kernel/kernel.module";

@Module({
  imports: [DataModule, KernelModule],
  controllers: [CashManagementController],
  providers: [
    PrismaCashRepository,
    { provide: CASH_REPOSITORY, useExisting: PrismaCashRepository },
    CreateRegisterUseCase,
    AddEntryUseCase,
    ReverseEntryUseCase,
    SubmitDailyCloseUseCase,
  ],
  exports: [
    CASH_REPOSITORY, 
    AddEntryUseCase, 
    CreateRegisterUseCase,
    SubmitDailyCloseUseCase
  ], 
})
export class CashManagementModule {}

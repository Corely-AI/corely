import { Module } from "@nestjs/common";
import { PrismaBankAccountRepositoryAdapter } from "./infrastructure/adapters/prisma-bank-account-repository.adapter";
import { PrismaPaymentMethodRepositoryAdapter } from "./infrastructure/adapters/prisma-payment-method-repository.adapter";
import { BankAccountsController } from "./adapters/http/bank-accounts.controller";
import { PaymentMethodsController } from "./adapters/http/payment-methods.controller";
import { BANK_ACCOUNT_REPOSITORY_PORT } from "./application/ports/bank-account-repository.port";
import { PAYMENT_METHOD_REPOSITORY_PORT } from "./application/ports/payment-method-repository.port";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";

@Module({
  imports: [DataModule, IdentityModule],
  controllers: [BankAccountsController, PaymentMethodsController],
  providers: [
    {
      provide: BANK_ACCOUNT_REPOSITORY_PORT,
      useClass: PrismaBankAccountRepositoryAdapter,
    },
    {
      provide: PAYMENT_METHOD_REPOSITORY_PORT,
      useClass: PrismaPaymentMethodRepositoryAdapter,
    },
  ],
  exports: [BANK_ACCOUNT_REPOSITORY_PORT, PAYMENT_METHOD_REPOSITORY_PORT],
})
export class PaymentMethodsModule {}

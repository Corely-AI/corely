import { CreateCashRegister } from "@corely/contracts";
import { CashRepositoryPort } from "../ports/cash-repository.port";
import { CashRegisterEntity } from "../../domain/entities";

export class CreateRegisterUseCase {
  constructor(private readonly repository: CashRepositoryPort) {}

  async execute(
    data: CreateCashRegister & { tenantId: string; workspaceId: string }
  ): Promise<CashRegisterEntity> {
    return this.repository.createRegister(data);
  }
}

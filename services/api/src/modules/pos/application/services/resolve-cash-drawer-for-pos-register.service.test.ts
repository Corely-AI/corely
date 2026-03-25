import { describe, expect, it, vi } from "vitest";
import { ok, type UseCaseContext } from "@corely/kernel";
import type { RegisterRepositoryPort } from "../ports/register-repository.port";
import { Register } from "../../domain/register.aggregate";
import { ResolveCashDrawerForPosRegisterService } from "./resolve-cash-drawer-for-pos-register.service";
import { CreateRegisterUseCase as CreateCashRegisterUseCase } from "../../../cash-management/application/use-cases/create-register.usecase";
import { GetCashRegisterQueryUseCase } from "../../../cash-management/application/use-cases/get-cash-register.query";

const createPosCtx = (): UseCaseContext => ({
  tenantId: "workspace-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  metadata: {
    permissions: ["*"],
    platformTenantId: "tenant-1",
  },
});

const createCashRegisterDto = (id: string) => ({
  id,
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  name: "Front Counter Drawer",
  location: "Front Counter",
  currency: "EUR",
  currentBalanceCents: 0,
  disallowNegativeBalance: false,
  createdAt: "2026-03-25T00:00:00.000Z",
  updatedAt: "2026-03-25T00:00:00.000Z",
});

class InMemoryRegisterRepository implements RegisterRepositoryPort {
  private readonly registers = new Map<string, Register>();

  constructor(registers: Register[]) {
    for (const register of registers) {
      this.registers.set(register.id, register);
    }
  }

  async findById(workspaceId: string, registerId: string): Promise<Register | null> {
    const register = this.registers.get(registerId) ?? null;
    if (!register || register.workspaceId !== workspaceId) {
      return null;
    }
    return register;
  }

  async findByWorkspace(workspaceId: string, status?: "ACTIVE" | "INACTIVE"): Promise<Register[]> {
    return [...this.registers.values()].filter(
      (register) =>
        register.workspaceId === workspaceId && (status ? register.status === status : true)
    );
  }

  async existsByName(workspaceId: string, name: string): Promise<boolean> {
    return [...this.registers.values()].some(
      (register) => register.workspaceId === workspaceId && register.name === name
    );
  }

  async save(register: Register): Promise<void> {
    this.registers.set(register.id, register);
  }

  async update(register: Register): Promise<void> {
    this.registers.set(register.id, register);
  }
}

const makeRegister = (cashDrawerId: string | null = null): Register =>
  new Register(
    "11111111-1111-1111-1111-111111111111",
    "workspace-1",
    cashDrawerId,
    "POS Front Counter",
    null,
    null,
    "ACTIVE",
    new Date("2026-03-25T00:00:00.000Z"),
    new Date("2026-03-25T00:00:00.000Z")
  );

describe("ResolveCashDrawerForPosRegisterService", () => {
  it("returns a typed error when a cash drawer binding is required but missing", async () => {
    const registerRepo = new InMemoryRegisterRepository([makeRegister(null)]);
    const createCashRegister = {
      execute: vi.fn(),
    } satisfies Pick<CreateCashRegisterUseCase, "execute">;
    const getCashRegister = {
      execute: vi.fn(),
    } satisfies Pick<GetCashRegisterQueryUseCase, "execute">;

    const service = new ResolveCashDrawerForPosRegisterService(
      registerRepo,
      createCashRegister as unknown as CreateCashRegisterUseCase,
      getCashRegister as unknown as GetCashRegisterQueryUseCase
    );

    const result = await service.execute(
      {
        posRegisterId: "11111111-1111-1111-1111-111111111111",
        autoCreate: false,
      },
      createPosCtx()
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected missing binding to fail");
    }

    expect(result.error.code).toBe("Pos:RegisterCashDrawerNotBound");
    expect(createCashRegister.execute).not.toHaveBeenCalled();
  });

  it("persists the created cash drawer binding and reuses it on retry", async () => {
    const registerRepo = new InMemoryRegisterRepository([makeRegister(null)]);
    const createCashRegister = {
      execute: vi.fn().mockResolvedValue(
        ok({
          register: createCashRegisterDto("cash-1"),
        })
      ),
    } satisfies Pick<CreateCashRegisterUseCase, "execute">;
    const getCashRegister = {
      execute: vi.fn().mockResolvedValueOnce(
        ok({
          register: createCashRegisterDto("cash-1"),
        })
      ),
    } satisfies Pick<GetCashRegisterQueryUseCase, "execute">;

    const service = new ResolveCashDrawerForPosRegisterService(
      registerRepo,
      createCashRegister as unknown as CreateCashRegisterUseCase,
      getCashRegister as unknown as GetCashRegisterQueryUseCase
    );

    const first = await service.execute(
      {
        posRegisterId: "11111111-1111-1111-1111-111111111111",
        autoCreate: true,
        idempotencyKey: "bind-1",
      },
      createPosCtx()
    );
    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error("Expected auto-create to succeed");
    }
    expect(first.value.cashDrawerId).toBe("cash-1");
    expect(first.value.resolution).toBe("auto_created");

    const second = await service.execute(
      {
        posRegisterId: "11111111-1111-1111-1111-111111111111",
        autoCreate: true,
        idempotencyKey: "bind-1",
      },
      createPosCtx()
    );

    expect(second.ok).toBe(true);
    if (!second.ok) {
      throw new Error("Expected bound retry to succeed");
    }

    expect(second.value.cashDrawerId).toBe("cash-1");
    expect(second.value.resolution).toBe("bound");
    expect(createCashRegister.execute).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from "vitest";
import { NoopLogger, unwrap, isErr } from "@corely/kernel";
import type { RentalContactSettings } from "@corely/contracts";
import { GetRentalSettingsUseCase } from "../get-rental-settings.usecase";
import { UpdateRentalSettingsUseCase } from "../update-rental-settings.usecase";
import type { RentalSettingsRepositoryPort } from "../../ports/settings-repository.port";

class FakeRentalSettingsRepo implements RentalSettingsRepositoryPort {
  public settings: RentalContactSettings | null = null;

  async getSettings() {
    return this.settings;
  }

  async saveSettings(_tenantId: string, _workspaceId: string, settings: RentalContactSettings) {
    this.settings = settings;
  }
}

const ctx = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: {},
};

describe("Rental settings use cases", () => {
  it("returns default settings when none are configured", async () => {
    const repo = new FakeRentalSettingsRepo();
    const useCase = new GetRentalSettingsUseCase({
      settingsRepo: repo,
      logger: new NoopLogger(),
    } as any);

    const result = await useCase.execute(undefined, ctx as any);
    const output = unwrap(result);

    expect(output.settings.hostContactMethod).toBe(null);
    expect(output.settings.hostContactEmail).toBe(null);
    expect(output.settings.hostContactPhone).toBe(null);
  });

  it("saves email settings and clears phone", async () => {
    const repo = new FakeRentalSettingsRepo();
    const useCase = new UpdateRentalSettingsUseCase({
      settingsRepo: repo,
      logger: new NoopLogger(),
    } as any);

    const result = await useCase.execute(
      {
        hostContactMethod: "EMAIL",
        hostContactEmail: "host@example.com",
      },
      ctx as any
    );
    const output = unwrap(result);

    expect(output.settings.hostContactMethod).toBe("EMAIL");
    expect(output.settings.hostContactEmail).toBe("host@example.com");
    expect(output.settings.hostContactPhone).toBe(null);
  });

  it("fails when contact method is PHONE but phone is missing", async () => {
    const repo = new FakeRentalSettingsRepo();
    const useCase = new UpdateRentalSettingsUseCase({
      settingsRepo: repo,
      logger: new NoopLogger(),
    } as any);

    const result = await useCase.execute({ hostContactMethod: "PHONE" }, ctx as any);
    expect(isErr(result)).toBe(true);
  });
});

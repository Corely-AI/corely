import { describe, expect, it } from "vitest";
import type { ClassesSettingsRepositoryPort } from "../application/ports/classes-settings-repository.port";
import { UpdateClassesBillingSettingsUseCase } from "../application/use-cases/update-classes-billing-settings.usecase";
import { ClassesBillingSettings } from "../domain/entities/classes.entities";

const ctx = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: {},
};

class FakeSettingsRepo implements ClassesSettingsRepositoryPort {
  public settings: ClassesBillingSettings | null = {
    billingMonthStrategy: "ARREARS_PREVIOUS_MONTH",
    billingBasis: "ATTENDED_SESSIONS",
    attendanceMode: "MANUAL",
  };

  async getSettings() {
    return this.settings;
  }
  async saveSettings(tenantId: string, workspaceId: string, settings: ClassesBillingSettings) {
    this.settings = settings;
  }
}

describe("UpdateClassesBillingSettingsUseCase", () => {
  it("updates attendanceMode correctly", async () => {
    const repo = new FakeSettingsRepo();
    const useCase = new UpdateClassesBillingSettingsUseCase(repo);

    await useCase.execute({ attendanceMode: "AUTO_FULL" }, ctx as any);

    expect(repo.settings?.attendanceMode).toBe("AUTO_FULL");
  });

  it("preserves attendanceMode when not provided", async () => {
    const repo = new FakeSettingsRepo();
    repo.settings!.attendanceMode = "AUTO_FULL";
    const useCase = new UpdateClassesBillingSettingsUseCase(repo);

    await useCase.execute({ billingMonthStrategy: "PREPAID_CURRENT_MONTH" }, ctx as any);

    expect(repo.settings?.attendanceMode).toBe("AUTO_FULL");
    expect(repo.settings?.billingMonthStrategy).toBe("PREPAID_CURRENT_MONTH");
  });
});

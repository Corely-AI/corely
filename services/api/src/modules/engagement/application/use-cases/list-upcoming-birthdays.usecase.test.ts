import { describe, expect, it } from "vitest";
import { NoopLogger, isErr } from "@corely/kernel";
import { ListUpcomingBirthdaysUseCase } from "./list-upcoming-birthdays.usecase";
import type { BirthdayRepositoryPort } from "../ports/birthday-repository.port";

describe("ListUpcomingBirthdaysUseCase", () => {
  it("returns only birthdays in the requested date window", async () => {
    const birthdays: BirthdayRepositoryPort = {
      listCustomerBirthdays: async () => [
        {
          customerPartyId: "customer-a",
          displayName: "Alice",
          birthday: new Date("1990-02-25T00:00:00.000Z"),
        },
        {
          customerPartyId: "customer-b",
          displayName: "Bob",
          birthday: new Date("1990-03-15T00:00:00.000Z"),
        },
        {
          customerPartyId: "customer-c",
          displayName: "Cara",
          birthday: new Date("1990-02-24T00:00:00.000Z"),
        },
      ],
    };

    const useCase = new ListUpcomingBirthdaysUseCase({
      logger: new NoopLogger(),
      birthdays,
    });

    const result = await useCase.execute(
      {
        from: "2026-02-24",
        to: "2026-03-10",
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
      }
    );

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("Expected use case to succeed");
    }

    expect(result.value.items.map((item) => item.customerPartyId)).toEqual([
      "customer-c",
      "customer-a",
    ]);
    expect(result.value.items[0]?.daysUntilBirthday).toBe(0);
    expect(result.value.items[1]?.daysUntilBirthday).toBe(1);
    expect(result.value.items.some((item) => item.customerPartyId === "customer-b")).toBe(false);
  });
});

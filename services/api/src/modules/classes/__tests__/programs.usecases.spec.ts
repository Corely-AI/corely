import { describe, expect, it } from "vitest";
import { ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import { CreateProgramUseCase } from "../application/use-cases/create-program.usecase";
import { ReplaceProgramSessionTemplatesUseCase } from "../application/use-cases/replace-program-session-templates.usecase";
import { ListProgramsUseCase } from "../application/use-cases/list-programs.usecase";
import type { AuditPort } from "../application/ports/audit.port";
import type { IdempotencyStoragePort } from "../application/ports/idempotency.port";
import type { IdGeneratorPort } from "../application/ports/id-generator.port";
import type { ClockPort } from "../application/ports/clock.port";
import type {
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
} from "../domain/entities/classes.entities";

const ctxManage: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: { permissions: ["classes.programs.manage"] },
};

const ctxView: UseCaseContext = {
  ...ctxManage,
  metadata: { permissions: ["classes.programs.view"] },
};

class FakeAudit implements AuditPort {
  async log() {}
}

class FakeIdempotency implements IdempotencyStoragePort {
  private readonly storeMap = new Map<string, unknown>();

  async get(actionKey: string, tenantId: string | null, key: string) {
    return this.storeMap.get(`${actionKey}:${tenantId}:${key}`) ?? null;
  }

  async store(actionKey: string, tenantId: string | null, key: string, response: unknown) {
    this.storeMap.set(`${actionKey}:${tenantId}:${key}`, response);
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  private counter = 1;
  newId(): string {
    const value = `id-${this.counter}`;
    this.counter += 1;
    return value;
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return new Date("2026-02-21T10:00:00.000Z");
  }
}

describe("Programs use-cases", () => {
  it("create program validates title and is idempotent", async () => {
    const created: ClassProgramEntity[] = [];
    const repo = {
      async createProgram(program: ClassProgramEntity) {
        created.push(program);
        return program;
      },
      async replaceProgramSessionTemplates(
        _tenantId: string,
        _workspaceId: string,
        _programId: string,
        items: ClassProgramSessionTemplateEntity[]
      ) {
        return items;
      },
      async replaceProgramMilestoneTemplates(
        _tenantId: string,
        _workspaceId: string,
        _programId: string,
        items: ClassProgramMilestoneTemplateEntity[]
      ) {
        return items;
      },
    };

    const useCase = new CreateProgramUseCase(
      repo as any,
      new FakeAudit(),
      new FakeIdempotency(),
      new FakeIdGenerator(),
      new FakeClock()
    );

    await expect(
      useCase.execute(
        {
          title: "   ",
          sessionTemplates: [],
          milestoneTemplates: [],
        } as any,
        ctxManage
      )
    ).rejects.toBeInstanceOf(ValidationFailedError);

    const first = await useCase.execute(
      {
        title: "A1.1 Combo",
        sessionTemplates: [],
        milestoneTemplates: [],
        idempotencyKey: "same-key",
      },
      ctxManage
    );
    const second = await useCase.execute(
      {
        title: "A1.1 Combo",
        sessionTemplates: [],
        milestoneTemplates: [],
        idempotencyKey: "same-key",
      },
      ctxManage
    );

    expect(first.program.id).toBe(second.program.id);
    expect(created).toHaveLength(1);
  });

  it("replace session templates validates duplicate indexes and persists", async () => {
    const repo = {
      async findProgramById() {
        return {
          id: "program-1",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          title: "A1.1",
          description: null,
          levelTag: "A1.1",
          expectedSessionsCount: 10,
          defaultTimezone: "Europe/Berlin",
          createdAt: new Date("2026-02-21T10:00:00.000Z"),
          updatedAt: new Date("2026-02-21T10:00:00.000Z"),
        } as ClassProgramEntity;
      },
      async replaceProgramSessionTemplates(
        _tenantId: string,
        _workspaceId: string,
        _programId: string,
        items: ClassProgramSessionTemplateEntity[]
      ) {
        return items;
      },
    };

    const useCase = new ReplaceProgramSessionTemplatesUseCase(
      repo as any,
      new FakeAudit(),
      new FakeIdGenerator(),
      new FakeClock()
    );

    await expect(
      useCase.execute(
        {
          programId: "program-1",
          items: [
            { index: 1, type: "LECTURE", title: null, defaultDurationMin: 120 },
            { index: 1, type: "LAB", title: null, defaultDurationMin: 90 },
          ],
        },
        ctxManage
      )
    ).rejects.toBeInstanceOf(ValidationFailedError);

    const items = await useCase.execute(
      {
        programId: "program-1",
        items: [
          { index: 0, type: "LECTURE", title: "Kickoff", defaultDurationMin: 120 },
          { index: 1, type: "LAB", title: "Practice", defaultDurationMin: 90 },
        ],
      },
      ctxManage
    );

    expect(items).toHaveLength(2);
    expect(items[0].index).toBe(0);
    expect(items[1].index).toBe(1);
  });

  it("list programs applies q filter and pagination", async () => {
    const programs: ClassProgramEntity[] = [
      {
        id: "p-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        title: "A1.1 Combo",
        description: null,
        levelTag: "A1.1",
        expectedSessionsCount: 25,
        defaultTimezone: null,
        createdAt: new Date("2026-02-20T00:00:00.000Z"),
        updatedAt: new Date("2026-02-21T00:00:00.000Z"),
      },
      {
        id: "p-2",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        title: "Bootcamp Part 1",
        description: null,
        levelTag: "B1",
        expectedSessionsCount: 34,
        defaultTimezone: null,
        createdAt: new Date("2026-02-20T00:00:00.000Z"),
        updatedAt: new Date("2026-02-21T00:00:00.000Z"),
      },
    ];

    const repo = {
      async listPrograms(
        _tenantId: string,
        _workspaceId: string,
        filters: { q?: string },
        pagination: { page: number; pageSize: number }
      ) {
        const filtered = filters.q
          ? programs.filter((program) =>
              program.title.toLowerCase().includes(filters.q!.toLowerCase())
            )
          : programs;
        const start = (pagination.page - 1) * pagination.pageSize;
        const items = filtered.slice(start, start + pagination.pageSize);
        return {
          items,
          total: filtered.length,
        };
      },
    };

    const useCase = new ListProgramsUseCase(repo as any);
    const result = await useCase.execute(
      {
        q: "a1.1",
        page: 1,
        pageSize: 1,
        sort: "updatedAt:desc",
      },
      ctxView
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("p-1");
    expect(result.pageInfo.total).toBe(1);
    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.pageSize).toBe(1);
  });
});

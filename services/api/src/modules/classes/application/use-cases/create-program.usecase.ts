import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { CreateProgramInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanProgramsManage } from "../../policies/assert-can-classes";
import type {
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
} from "../../domain/entities/classes.entities";
import {
  assertValidExpectedSessionsCount,
  assertValidMilestoneTemplates,
  assertValidProgramTitle,
  assertValidSessionTemplates,
} from "../../domain/rules/program.rules";

@RequireTenant()
export class CreateProgramUseCase {
  private readonly actionKey = "classes.program.create";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateProgramInput,
    ctx: UseCaseContext
  ): Promise<{
    program: ClassProgramEntity;
    sessionTemplates: ClassProgramSessionTemplateEntity[];
    milestoneTemplates: ClassProgramMilestoneTemplateEntity[];
  }> {
    assertCanProgramsManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    assertValidProgramTitle(input.title);
    assertValidExpectedSessionsCount(input.expectedSessionsCount);
    assertValidSessionTemplates(input.sessionTemplates ?? []);
    assertValidMilestoneTemplates(input.milestoneTemplates ?? []);

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return this.fromJson(cached.body);
      }
    }

    const now = this.clock.now();
    const program = await this.repo.createProgram({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      title: input.title.trim(),
      description: input.description ?? null,
      levelTag: input.levelTag ?? null,
      expectedSessionsCount: input.expectedSessionsCount ?? null,
      defaultTimezone: input.defaultTimezone ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const sessionTemplates = await this.repo.replaceProgramSessionTemplates(
      tenantId,
      workspaceId,
      program.id,
      (input.sessionTemplates ?? []).map((template) => ({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        programId: program.id,
        index: template.index,
        title: template.title ?? null,
        defaultDurationMin: template.defaultDurationMin ?? null,
        type: template.type,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const milestoneTemplates = await this.repo.replaceProgramMilestoneTemplates(
      tenantId,
      workspaceId,
      program.id,
      (input.milestoneTemplates ?? []).map((template) => ({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        programId: program.id,
        title: template.title,
        type: template.type,
        required: template.required,
        index: template.index,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const output = {
      program,
      sessionTemplates,
      milestoneTemplates,
    };

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.program.created",
      entityType: "ClassProgram",
      entityId: program.id,
      metadata: {
        title: program.title,
        sessionTemplateCount: sessionTemplates.length,
        milestoneTemplateCount: milestoneTemplates.length,
      },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: this.toJson(output),
      });
    }

    return output;
  }

  private toJson(output: {
    program: ClassProgramEntity;
    sessionTemplates: ClassProgramSessionTemplateEntity[];
    milestoneTemplates: ClassProgramMilestoneTemplateEntity[];
  }) {
    return {
      program: {
        ...output.program,
        createdAt: output.program.createdAt.toISOString(),
        updatedAt: output.program.updatedAt.toISOString(),
      },
      sessionTemplates: output.sessionTemplates.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      milestoneTemplates: output.milestoneTemplates.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  }

  private fromJson(body: any) {
    return {
      program: {
        ...body.program,
        createdAt: new Date(body.program.createdAt),
        updatedAt: new Date(body.program.updatedAt),
      } as ClassProgramEntity,
      sessionTemplates: Array.isArray(body.sessionTemplates)
        ? body.sessionTemplates.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          }))
        : [],
      milestoneTemplates: Array.isArray(body.milestoneTemplates)
        ? body.milestoneTemplates.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          }))
        : [],
    } as {
      program: ClassProgramEntity;
      sessionTemplates: ClassProgramSessionTemplateEntity[];
      milestoneTemplates: ClassProgramMilestoneTemplateEntity[];
    };
  }
}

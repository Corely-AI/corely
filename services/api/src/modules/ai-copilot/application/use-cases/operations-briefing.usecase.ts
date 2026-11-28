import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import { EnvService } from "@corely/config";
import { OperationsBriefingFeedbackSchema, type OperationsBriefing } from "@corely/contracts";
import {
  CLOCK_PORT_TOKEN,
  type ClockPort,
  type ObservabilityPort,
  type UseCaseContext,
} from "@corely/kernel";
import { PromptRegistry } from "@corely/prompts";
import { OperationsTodayUseCase } from "../../../operations-today/public";
import { TenantEntitlementService } from "../../../platform/public";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../shared/ai/ai-text.port";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";
import { briefingFacts, briefingSnapshot } from "../policies/operations-briefing-facts";

const orderSchema = z.object({ ids: z.array(z.number().int().positive()).max(5) }).strict();

function selectedOrdinals(raw: string, limit: number) {
  if (raw.length > 120) {
    return [];
  }
  try {
    const parsed = orderSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.ids.every((id) => id <= limit)
      ? [...new Set(parsed.data.ids)]
      : [];
  } catch {
    return [];
  }
}

@Injectable()
export class OperationsBriefingUseCase {
  constructor(
    @Inject(OperationsTodayUseCase) private readonly today: Pick<OperationsTodayUseCase, "execute">,
    @Inject(AI_TEXT_PORT) private readonly model: AiTextPort,
    @Inject(TenantEntitlementService)
    private readonly apps: Pick<TenantEntitlementService, "isAppEnabled">,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject("OBSERVABILITY_PORT") private readonly telemetry: ObservabilityPort,
    private readonly env: EnvService,
    private readonly prompts: PromptRegistry
  ) {}

  private tenant(ctx: UseCaseContext) {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new ForbiddenException("Select an authorized workspace");
    }
    return ctx.tenantId;
  }

  async execute(ctx: UseCaseContext): Promise<OperationsBriefing> {
    const tenantId = this.tenant(ctx);
    if (!(await this.apps.isAppEnabled(tenantId, "ai-copilot"))) {
      return { status: "unavailable" };
    }
    const span = this.telemetry.startSpan("copilot.operations-briefing", {
      "ai.model": this.env.AI_MODEL_ID,
      "ai.provider": this.env.AI_MODEL_PROVIDER,
    });
    const started = this.clock.now().getTime();
    let outcome = "unavailable";
    try {
      const result = await this.generate(ctx, tenantId, (usage) => {
        this.telemetry.setAttributes(span, {
          ...(usage.inputTokens === undefined ? {} : { "tokens.input": usage.inputTokens }),
          ...(usage.outputTokens === undefined ? {} : { "tokens.output": usage.outputTokens }),
        });
      });
      outcome = result.status;
      this.telemetry.setAttributes(span, {
        "briefing.entries": result.status === "ready" ? result.entries.length : 0,
      });
      return result;
    } finally {
      this.telemetry.setAttributes(span, {
        "briefing.outcome": outcome,
        "briefing.latency_ms": Math.max(0, this.clock.now().getTime() - started),
      });
      this.telemetry.endSpan(span);
    }
  }

  private async generate(
    ctx: UseCaseContext,
    tenantId: string,
    onUsage: (usage: { inputTokens?: number; outputTokens?: number }) => void
  ): Promise<OperationsBriefing> {
    const initial = await this.today.execute(ctx);
    if (initial.workspaceId !== ctx.workspaceId) {
      throw new ForbiddenException("Select an authorized workspace");
    }
    const now = this.clock.now();
    const snapshot = briefingSnapshot(initial, now);
    const facts = briefingFacts(initial, now);
    if (!facts.length) {
      return { ...snapshot, status: "insufficient" };
    }
    const prompt = this.prompts.render(
      "operations.copilot.briefing",
      buildPromptContext({ env: this.env, tenantId }),
      {}
    );
    let raw: string;
    try {
      raw = await this.model.generateText({
        systemPrompt: prompt.content,
        userPrompt: JSON.stringify({
          date: initial.date,
          timezone: initial.timezone,
          facts: facts.map(({ kind, at }, index) => ({ id: index + 1, kind, at })),
        }),
        temperature: 0,
        maxOutputTokens: 96,
        onUsage,
      });
    } catch {
      return { status: "unavailable" };
    }
    const order = selectedOrdinals(raw, facts.length);
    if (!order.length) {
      return { ...snapshot, status: "insufficient" };
    }
    if (!(await this.apps.isAppEnabled(tenantId, "ai-copilot"))) {
      return { status: "unavailable" };
    }
    const current = await this.today.execute(ctx);
    if (current.workspaceId !== ctx.workspaceId) {
      throw new ForbiddenException("Select an authorized workspace");
    }
    const recheckedAt = this.clock.now();
    const currentSnapshot = briefingSnapshot(current, recheckedAt);
    const storedFacts = briefingFacts(current, recheckedAt, Infinity);
    const selected = order.map((ordinal) => facts[ordinal - 1]);
    const unchanged =
      initial.date === current.date &&
      initial.timezone === current.timezone &&
      selected.every((item) =>
        storedFacts.some(
          (other) => item.href === other.href && item.kind === other.kind && item.at === other.at
        )
      );
    return unchanged
      ? { ...currentSnapshot, status: "ready", entries: selected }
      : { ...currentSnapshot, status: "changed" };
  }

  async feedback(input: unknown, ctx: UseCaseContext): Promise<void> {
    const tenantId = this.tenant(ctx);
    const result = OperationsBriefingFeedbackSchema.safeParse(input);
    if (!result.success) {
      throw new BadRequestException("Invalid briefing feedback");
    }
    if (!(await this.apps.isAppEnabled(tenantId, "ai-copilot"))) {
      throw new ForbiddenException("Operations briefing unavailable");
    }
    const span = this.telemetry.startSpan("copilot.operations-briefing.feedback", {
      "briefing.feedback": result.data.outcome,
      "briefing.review_ms": result.data.reviewMs,
    });
    this.telemetry.endSpan(span);
  }
}

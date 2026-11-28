import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { KnowledgeQuestionSchema, type KnowledgeAnswer } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { EnvService } from "@corely/config";
import { PromptRegistry } from "@corely/prompts";
import { z } from "zod";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../shared/ai/ai-text.port";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";
import { PUBLISHED_PROCEDURES, type PublishedProcedureReader } from "../../../knowledge/public";
import { TenantEntitlementService } from "../../../platform/public";

const SelectionSchema = z.object({ ids: z.array(z.number().int().positive()).max(3) }).strict();

function selectedIds(raw: string) {
  if (raw.length > 120) {
    return [];
  }
  try {
    const parsed = SelectionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? [...new Set(parsed.data.ids)] : [];
  } catch {
    return [];
  }
}

@Injectable()
export class AnswerKnowledgeQuestionUseCase {
  constructor(
    @Inject(PUBLISHED_PROCEDURES)
    private readonly procedures: Pick<
      PublishedProcedureReader,
      "findPublishedPassages" | "detailPublished"
    >,
    @Inject(AI_TEXT_PORT) private readonly model: AiTextPort,
    @Inject(TenantEntitlementService)
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">,
    private readonly prompts: PromptRegistry,
    private readonly env: EnvService
  ) {}

  async execute(input: unknown, ctx: UseCaseContext): Promise<KnowledgeAnswer> {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const body = KnowledgeQuestionSchema.safeParse(input);
    if (!body.success) {
      throw new BadRequestException("Enter a valid Knowledge question");
    }
    if (!(await this.entitlements.isAppEnabled(tenantId, "ai-copilot"))) {
      return { status: "unavailable" };
    }
    const question = body.data.question;
    const candidates = await this.procedures.findPublishedPassages(question, ctx);
    if (!candidates.length) {
      return { status: "insufficient" };
    }
    const prompt = this.prompts.render(
      "knowledge.copilot.select-passages",
      buildPromptContext({ env: this.env, tenantId }),
      {}
    );
    let raw: string;
    try {
      raw = await this.model.generateText({
        systemPrompt: prompt.content,
        userPrompt: JSON.stringify({
          question,
          passages: candidates.map(({ title, quote }, index) => ({ id: index + 1, title, quote })),
        }),
        temperature: 0,
        maxOutputTokens: 64,
      });
    } catch {
      return { status: "unavailable" };
    }
    const ids = selectedIds(raw);
    if (!ids.length || ids.some((id) => id > candidates.length)) {
      return { status: "insufficient" };
    }
    if (!(await this.entitlements.isAppEnabled(tenantId, "ai-copilot"))) {
      return { status: "unavailable" };
    }
    const citations = ids.map((id) => candidates[id - 1]);
    try {
      const sources = new Map(
        await Promise.all(
          [...new Set(citations.map((citation) => citation.id))].map(
            async (id) => [id, await this.procedures.detailPublished(id, ctx)] as const
          )
        )
      );
      const current = citations.flatMap((citation) => {
        const reader = sources.get(citation.id);
        const source = reader?.published;
        if (
          !reader ||
          source?.version !== citation.version ||
          source.content.kind !== "page" ||
          !source.content.text.includes(citation.quote)
        ) {
          return [];
        }
        return [
          {
            ...citation,
            title: source.title,
            publishedAt: source.publishedAt,
            reviewDate: source.reviewDate,
            reviewOverdue: reader.reviewOverdue,
          },
        ];
      });
      if (current.length !== citations.length) {
        return { status: "source-changed" };
      }
      return { status: "answered", checkedAt: new Date().toISOString(), citations: current };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        return { status: "source-changed" };
      }
      throw error;
    }
  }
}

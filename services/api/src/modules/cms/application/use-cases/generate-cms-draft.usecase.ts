import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { JSONContent } from '@tiptap/core';
import {
 BaseUseCase,
 type LoggerPort,
 type Result,
 type UseCaseContext,
 type UseCaseError,
 ValidationError,
 ExternalServiceError,
 err,
 ok,
 type ClockPort,
 type IdGeneratorPort,
} from '@corely/kernel';
import { type GenerateCmsDraftInput, type GenerateCmsDraftOutput } from '@corely/contracts';
import type { EnvService } from '@corely/config';
import type { PromptRegistry } from '@corely/prompts';
import { buildPromptContext } from '../../../shared/prompts/prompt-context';
import { type PromptUsageLogger } from '../../../shared/prompts/prompt-usage.logger';
import { PrismaAgentRunRepository } from '../../ai-copilot/infrastructure/adapters/prisma-agent-run-repository.adapter';
import { PrismaToolExecutionRepository } from '../../ai-copilot/infrastructure/adapters/prisma-tool-execution-repository.adapter';

type Deps = {
 logger: LoggerPort;
 env: EnvService;
 promptRegistry: PromptRegistry;
 promptUsageLogger: PromptUsageLogger;
 agentRuns: PrismaAgentRunRepository;
 toolExecutions: PrismaToolExecutionRepository;
 idGenerator: IdGeneratorPort;
 clock: ClockPort;
};

const outputSchema = z.object({
 title: z.string(),
 excerpt: z.string(),
 slugSuggestion: z.string(),
 metaTitle: z.string(),
 metaDescription: z.string(),
 contentJson: z.unknown(),
});

export class GenerateCmsDraftUseCase extends BaseUseCase<
 GenerateCmsDraftInput,
 GenerateCmsDraftOutput
> {
 constructor(private readonly useCaseDeps: Deps) {
 super({ logger: useCaseDeps.logger });
 }

 protected validate(input: GenerateCmsDraftInput): GenerateCmsDraftInput {
 if (!input.topic?.trim()) {
 throw new ValidationError('topic is required');
 }
 if (!input.keyword?.trim()) {
 throw new ValidationError('keyword is required');
 }
 return input;
 }

 protected async handle(
 input: GenerateCmsDraftInput,
 ctx: UseCaseContext
 ): Promise<Result<GenerateCmsDraftOutput, UseCaseError>> {
 if (!ctx.tenantId || !ctx.workspaceId) {
 return err(new ValidationError('tenantId or workspaceId missing from context'));
 }

 const runId = this.useCaseDeps.idGenerator.newId();
 const toolCallId = this.useCaseDeps.idGenerator.newId();
 const executionId = this.useCaseDeps.idGenerator.newId();

 await this.useCaseDeps.agentRuns.create({
 id: runId,
 tenantId: ctx.tenantId,
 createdByUserId: ctx.userId ?? null,
 status: 'running',
 traceId: ctx.requestId,
 metadataJson: JSON.stringify({ feature: 'cms.generate_draft' }),
 });

 await this.useCaseDeps.toolExecutions.create({
 id: executionId,
 tenantId: ctx.tenantId,
 runId,
 toolCallId,
 toolName: 'cms_generate_draft',
 inputJson: JSON.stringify({
 topic: input.topic,
 keyword: input.keyword,
 tone: input.tone,
 language: input.language,
 }),
 status: 'running',
 traceId: ctx.requestId,
 });

 try {
 const prompt = this.useCaseDeps.promptRegistry.render(
 'cms.generate_draft',
 buildPromptContext({ env: this.useCaseDeps.env, tenantId: ctx.tenantId }),
 {
 TOPIC: input.topic,
 KEYWORD: input.keyword,
 TONE: input.tone ?? 'neutral',
 LANGUAGE: input.language ?? 'English',
 }
 );

 this.useCaseDeps.promptUsageLogger.logUsage({
 promptId: prompt.promptId,
 promptVersion: prompt.promptVersion,
 promptHash: prompt.promptHash,
 modelId: this.useCaseDeps.env.AI_MODEL_ID,
 provider: this.useCaseDeps.env.AI_MODEL_PROVIDER,
 tenantId: ctx.tenantId,
 userId: ctx.userId ?? undefined,
 runId,
 toolName: 'cms_generate_draft',
 purpose: 'cms.generate_draft',
 });

 const model = this.resolveModel(this.useCaseDeps.env);

 const { object } = await generateObject({
 model,
 schema: outputSchema,
 prompt: prompt.content,
 });

 const normalized = {
 title: object.title,
 excerpt: object.excerpt,
 slugSuggestion: slugify(object.slugSuggestion || object.title),
 metaTitle: object.metaTitle,
 metaDescription: object.metaDescription,
 contentJson: normalizeDoc(object.contentJson),
 };

 await this.useCaseDeps.toolExecutions.complete(ctx.tenantId, runId, toolCallId, {
 status: 'completed',
 outputJson: JSON.stringify(normalized),
 });

 await this.useCaseDeps.agentRuns.updateStatus(runId, 'completed', this.useCaseDeps.clock.now());

 return ok(normalized);
 } catch (error) {
 const errorPayload = {
 message: error instanceof Error ? error.message : 'Draft generation failed',
 };

 await this.useCaseDeps.toolExecutions.complete(ctx.tenantId, runId, toolCallId, {
 status: 'failed',
 errorJson: JSON.stringify(errorPayload),
 });

 await this.useCaseDeps.agentRuns.updateStatus(runId, 'failed', this.useCaseDeps.clock.now());

 return err(new ExternalServiceError('AI draft generation failed', errorPayload));
 }
 }

 private resolveModel(env: EnvService): LanguageModel {
 const modelId = env.AI_MODEL_ID;
 return env.AI_MODEL_PROVIDER === 'anthropic'
 ? (anthropic(modelId) as unknown as LanguageModel)
 : (openai(modelId) as unknown as LanguageModel);
 }
}

const slugify = (value: string) =>
 value
 .toLowerCase()
 .trim()
 .replace(/[^a-z0-9\s-]/g, '')
 .replace(/\s+/g, '-')
 .replace(/-+/g, '-')
 .substring(0, 80);

const normalizeDoc = (doc: unknown) => {
 if (!isDocNode(doc)) {
 return { type: 'doc', content: [] };
 }
 return doc;
};

const isDocNode = (doc: unknown): doc is JSONContent => {
 if (!doc || typeof doc !== 'object') {
 return false;
 }
 const candidate = doc as { type?: unknown; content?: unknown };
 return candidate.type === 'doc' && Array.isArray(candidate.content);
};

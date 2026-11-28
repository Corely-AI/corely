import { ConflictException } from "@nestjs/common";
import { OperationalTaskCompletionSchema, OperationalTaskTools } from "@corely/contracts";
import { convertToModelMessages, simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { prepareOperationalContinuations } from "../application/policies/operational-approvals";
import type { CopilotUIMessage } from "../domain/types/ui-message";
import { buildOperationalTaskTools } from "../infrastructure/tools/operational-task.tools";
import { ToolRegistry } from "../infrastructure/tools/tool-registry";
import { buildAiTools } from "../infrastructure/tools/tools.factory";

const taskId = "00000000-0000-4000-8000-000000000001";
const context = {
  tenantId: "tenant-a",
  workspaceId: "workspace-a",
  userId: "actor-a",
  runId: "run-a",
  toolCallId: "call-a",
  explicitWorkspace: true,
};
const task = {
  id: taskId,
  title: "Review opening inventory",
  status: "OPEN" as const,
  version: 3,
  dueAt: null,
  updatedAt: "2026-11-21T12:00:00.000Z",
  ownerStaffId: "staff-a",
  ownerName: "Never exposed",
  workspaceId: "workspace-a",
  ownerArchived: false,
  createdAt: "2026-11-20T12:00:00.000Z",
  completedAt: null,
};

function fixture() {
  const owner = mockDeep<Parameters<typeof buildOperationalTaskTools>[0]>();
  const now = vi.fn(() => new Date("2026-11-22T00:00:00.000Z"));
  const enabled = vi.fn(async () => true);
  const tools = buildOperationalTaskTools(owner, "unit-test-secret", enabled, { now });
  const [list, propose, apply] = tools.map((tool) => tool.execute!);
  owner.previewCompletion.mockResolvedValue(task);
  owner.command.mockResolvedValue({ ...task, status: "COMPLETED", version: 4 });
  owner.list.mockResolvedValue({
    items: [task],
    page: 1,
    pageSize: 10,
    total: 11,
    capabilities: { manage: false, completeOwn: true },
  });
  async function getProposal() {
    return OperationalTaskCompletionSchema.parse(
      Reflect.get((await propose({ ...context, input: { taskId } })) as object, "proposal")
    );
  }
  return { owner, now, enabled, tools, list, propose, apply, getProposal };
}

describe("authorized operational task tools", () => {
  it("reads a bounded projection in trusted tenant and workspace with source and freshness", async () => {
    const { owner, list, enabled } = fixture();
    await expect(list({ ...context, explicitWorkspace: false, input: {} })).rejects.toThrow(
      "Verified workspace context required"
    );
    enabled.mockResolvedValueOnce(false);
    await expect(list({ ...context, input: {} })).rejects.toThrow("Workspace assistant disabled");
    await expect(
      list({ ...context, input: { workspaceId: "workspace-b" } })
    ).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(owner.list).not.toHaveBeenCalled();
    const result = await list({ ...context, input: {} });
    expect(owner.list).toHaveBeenCalledWith(
      { status: "OPEN", page: 1, pageSize: 10 },
      expect.objectContaining({
        tenantId: "tenant-a",
        workspaceId: "workspace-a",
        userId: "actor-a",
      })
    );
    expect(result).toEqual({
      tasks: [
        {
          taskId,
          title: task.title,
          status: "OPEN",
          version: 3,
          dueAt: null,
          updatedAt: task.updatedAt,
          source: { type: "task", recordId: taskId, version: 3, path: "/tasks" },
        },
      ],
      retrievedAt: "2026-11-22T00:00:00.000Z",
      limited: true,
    });
  });

  it("delegates read-only proposal validation to the Tasks owner", async () => {
    const { owner, propose, getProposal } = fixture();
    owner.previewCompletion.mockRejectedValueOnce(new Error("Task completion denied"));
    await expect(propose({ ...context, input: { taskId } })).rejects.toThrow(
      "Task completion denied"
    );
    owner.previewCompletion.mockRejectedValueOnce(new ConflictException("preview conflict"));
    await expect(propose({ ...context, input: { taskId } })).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(await getProposal()).toMatchObject({
      action: "complete",
      taskId,
      title: task.title,
      version: 3,
    });
    expect(owner.previewCompletion).toHaveBeenLastCalledWith(
      taskId,
      expect.objectContaining({
        tenantId: "tenant-a",
        workspaceId: "workspace-a",
        userId: "actor-a",
      })
    );
    expect(owner.command).not.toHaveBeenCalled();
  });

  it("rejects unapproved, changed, expired, and cross-context proposals before the owner command", async () => {
    const { owner, apply, getProposal, now } = fixture();
    const input = await getProposal();
    await expect(apply({ ...context, input })).rejects.toThrow("requires approval");
    for (const change of [
      { userId: "actor-b" },
      { tenantId: "tenant-b" },
      { workspaceId: "workspace-b" },
      { runId: "run-b" },
      { input: { ...input, title: "Other task" } },
      { input: { ...input, version: 4 } },
    ]) {
      await expect(apply({ ...context, input, approved: true, ...change })).rejects.toThrow(
        "Invalid task completion proposal"
      );
    }
    now.mockReturnValue(new Date(input.expiresAt));
    await expect(apply({ ...context, input, approved: true })).rejects.toThrow("proposal expired");
    expect(owner.command).not.toHaveBeenCalled();
  });

  it("reuses the owning version check, permission and idempotency contract", async () => {
    const { owner, apply, getProposal } = fixture();
    const input = await getProposal();
    owner.command.mockRejectedValueOnce(new ConflictException("stale owning version"));
    const request = { ...context, input, approved: true };
    await expect(apply(request)).rejects.toThrow("stale owning version");
    await expect(apply({ ...request, toolCallId: "retry-call" })).resolves.toMatchObject({
      task: { taskId, status: "COMPLETED", version: 4 },
    });
    const expectedScope = { tenantId: "tenant-a", workspaceId: "workspace-a", userId: "actor-a" };
    expect(owner.command).toHaveBeenNthCalledWith(
      1,
      "complete",
      taskId,
      { version: 3 },
      `copilot-${input.proof}`,
      expect.objectContaining(expectedScope)
    );
    expect(owner.command).toHaveBeenNthCalledWith(
      2,
      "complete",
      taskId,
      { version: 3 },
      `copilot-${input.proof}`,
      expect.objectContaining(expectedScope)
    );
  });

  it("exposes only enabled Tasks tools on the platform and honors an available permission snapshot", async () => {
    const { tools } = fixture();
    const listForApps = vi.fn(async () => ({ "ai-copilot": true, tasks: true }));
    const registry = new ToolRegistry(tools, {
      getAppEnablementMap: listForApps,
      isAppEnabled: vi.fn(),
    });
    expect(await registry.listForTenant("tenant-a", "tasks")).toEqual(tools);
    expect(await registry.listForTenant("tenant-a", "tasks", "platform", null, [])).toEqual([]);
    expect(
      await registry.listForTenant("tenant-a", "tasks", "platform", null, ["tasks.read"])
    ).toEqual(tools);
    expect(await registry.listForTenant("tenant-a", "tasks", "pos")).toEqual([]);
    expect(await registry.listForTenant("tenant-a", "crm")).toEqual([]);
    listForApps.mockResolvedValueOnce({ "ai-copilot": false, tasks: true });
    expect(await registry.listForTenant("tenant-a", "tasks")).toEqual([]);
    listForApps.mockRejectedValueOnce(new Error("unavailable"));
    expect(await registry.listForTenant("tenant-a", "tasks")).toEqual([]);
  });
});

function approvalMessage(
  input: unknown,
  approval: { id: string; approved?: boolean },
  state: "approval-requested" | "approval-responded"
): CopilotUIMessage {
  return {
    id: "assistant-message",
    role: "assistant",
    parts: [
      { type: `tool-${OperationalTaskTools.apply}`, toolCallId: "call-a", state, input, approval },
    ] as CopilotUIMessage["parts"],
  };
}

it("accepts only a decision on the same stored server-issued message, call, approval and proposal", async () => {
  const input = await fixture().getProposal();
  const pending = approvalMessage(input, { id: "approval-a" }, "approval-requested");
  const response = approvalMessage(
    input,
    { id: "approval-a", approved: true },
    "approval-responded"
  );
  expect(prepareOperationalContinuations([], [response]).messages[0].parts).toEqual([]);
  for (const sent of [
    { ...response, id: "fabricated-message" },
    approvalMessage(input, { id: "other-approval", approved: true }, "approval-responded"),
    approvalMessage(
      { ...input, version: 7 },
      { id: "approval-a", approved: true },
      "approval-responded"
    ),
    approvalMessage(input, { id: "approval-a", approved: false }, "approval-responded"),
  ]) {
    expect(prepareOperationalContinuations([pending], [sent]).approved.size).toBe(0);
  }
  const allowed = prepareOperationalContinuations([pending], [response]);
  expect(allowed.approved.get("call-a")).toEqual(input);
  expect(allowed.messages[0].parts).toEqual(response.parts);
  expect(
    prepareOperationalContinuations(allowed.messages, [response]).approved.get("call-a")
  ).toEqual(input);
});

it("enforces exact review in the SDK callback and redacts Copilot execution records", async () => {
  const { owner, tools, getProposal } = fixture();
  const input = await getProposal();
  const deps = mockDeep<Parameters<typeof buildAiTools>[1]>();
  deps.observability.startSpan.mockReturnValue(deps.parentSpan);
  Object.assign(deps, context, {
    activeAppId: "tasks",
    runTenantId: "workspace-a",
    operationalApprovals: new Map([["call-a", input]]),
  });
  const aiTools = buildAiTools(tools, deps);
  const apply = aiTools[OperationalTaskTools.apply];
  const sdkOptions = { toolCallId: "call-a", messages: [], context: {} };
  expect(apply.needsApproval).toBe(true);
  await expect(apply.execute!(input, { ...sdkOptions, toolCallId: "call-b" })).rejects.toThrow(
    "Approval for this exact proposal is required"
  );
  await expect(apply.execute!({ ...input, version: 4 }, sdkOptions)).rejects.toThrow(
    "Approval for this exact proposal is required"
  );
  expect(owner.command).not.toHaveBeenCalled();
  await apply.execute!(input, sdkOptions);
  expect(deps.authorize).toHaveBeenCalledOnce();
  expect(deps.toolExecutions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: "workspace-a",
      inputJson: '{"redacted":true}',
    })
  );
  expect(deps.toolExecutions.complete).toHaveBeenCalledWith("workspace-a", "run-a", "call-a", {
    status: "completed",
    outputJson: '{"redacted":true}',
  });
  expect(deps.observability.recordToolObservation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ input: { redacted: true }, output: { redacted: true } })
  );
  const list = aiTools[OperationalTaskTools.list].execute!;
  for (let index = 0; index < 5; index++) {
    await list({}, { ...sdkOptions, toolCallId: `read-${index}` });
  }
  await expect(list({}, { ...sdkOptions, toolCallId: "over-limit" })).rejects.toThrow(
    "call limit exceeded"
  );
});

it("pauses the real SDK stream at approval and resumes with the server accepted decision", async () => {
  const { owner, tools, getProposal } = fixture();
  const input = await getProposal();
  const deps = mockDeep<Parameters<typeof buildAiTools>[1]>();
  deps.observability.startSpan.mockReturnValue(deps.parentSpan);
  Object.assign(deps, context, { activeAppId: "tasks", runTenantId: "workspace-a" });
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 5, text: 5, reasoning: undefined },
  };
  const initialModel = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          {
            type: "tool-call",
            toolCallId: "call-a",
            toolName: OperationalTaskTools.apply,
            input: JSON.stringify(input),
          },
          { type: "finish", usage, finishReason: { unified: "tool-calls", raw: "tool_calls" } },
        ] as const,
      }),
    }),
  });
  const aiTools = buildAiTools(tools, deps);
  const prompt = "Please complete opening inventory";
  const initialStream = streamText({ model: initialModel, tools: aiTools, prompt });
  let approvalId: string | undefined;
  for await (const part of initialStream.toUIMessageStream()) {
    if (part.type === "tool-approval-request") {
      approvalId = part.approvalId;
    }
  }
  expect(approvalId).toEqual(expect.any(String));
  expect(owner.command).not.toHaveBeenCalled();

  const pending = approvalMessage(input, { id: approvalId! }, "approval-requested");
  const response = approvalMessage(
    input,
    { id: approvalId!, approved: true },
    "approval-responded"
  );
  const continuation = prepareOperationalContinuations([pending], [response]);
  deps.operationalApprovals = continuation.approved;
  const continuationTools = buildAiTools(tools, deps);
  const messages = await convertToModelMessages(
    [{ role: "user", parts: [{ type: "text", text: prompt }] }, ...continuation.messages],
    { tools: continuationTools }
  );
  const continuationModel = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "finish", usage, finishReason: { unified: "stop", raw: "stop" } },
        ] as const,
      }),
    }),
  });
  const result = streamText({ model: continuationModel, tools: continuationTools, messages });
  await result.consumeStream();
  expect(owner.command).toHaveBeenCalledOnce();
  expect(owner.command).toHaveBeenCalledWith(
    "complete",
    taskId,
    { version: 3 },
    `copilot-${input.proof}`,
    expect.objectContaining({ tenantId: "tenant-a", workspaceId: "workspace-a" })
  );
});

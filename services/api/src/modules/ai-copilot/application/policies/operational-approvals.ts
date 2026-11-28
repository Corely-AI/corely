import {
  CopilotToolInvocationSchema,
  OperationalTaskCompletionSchema,
  OperationalTaskTools,
  type OperationalTaskCompletion,
} from "@corely/contracts";
import type { CopilotUIMessage } from "../../domain/types/ui-message";

type MessagePart = CopilotUIMessage["parts"][number];

export function isOperationalToolName(name: string) {
  return Object.values(OperationalTaskTools).some((toolName) => toolName === name);
}

function operationalPart(part: MessagePart) {
  const result = CopilotToolInvocationSchema.safeParse(part);
  if (!result.success) {
    return null;
  }
  const fromType = result.data.type.replace(/^tool-/, "");
  const name = isOperationalToolName(fromType) ? fromType : result.data.toolName;
  return name && isOperationalToolName(name) ? { ...result.data, name } : null;
}

function sameProposal(left: unknown, right: unknown) {
  const a = OperationalTaskCompletionSchema.safeParse(left);
  const b = OperationalTaskCompletionSchema.safeParse(right);
  return a.success && b.success && JSON.stringify(a.data) === JSON.stringify(b.data);
}

export function matchesOperationalApproval(
  proposal: OperationalTaskCompletion | undefined,
  input: unknown
) {
  return proposal !== undefined && sameProposal(proposal, input);
}

/** Authorize only the actor decision. The proposal and approval ID come from stored server history. */
export function prepareOperationalContinuations(
  history: CopilotUIMessage[],
  incoming: CopilotUIMessage[]
) {
  const storedById = new Map(history.map((message) => [message.id, message]));
  const approved = new Map<string, OperationalTaskCompletion>();

  const messages = incoming.map((message) => {
    const stored = storedById.get(message.id);
    const parts = message.parts ?? [];
    const sentOperations = parts.map(operationalPart).filter((part) => part !== null);
    if (!sentOperations.length && !stored?.parts?.some(operationalPart)) {
      return message;
    }
    if (message.role !== "assistant" || stored?.role !== "assistant") {
      return { ...message, parts: parts.filter((part) => !operationalPart(part)) };
    }
    return {
      ...stored,
      parts: stored.parts.map((part) => {
        const pending = operationalPart(part);
        if (
          pending?.name !== OperationalTaskTools.apply ||
          !pending.approval?.id ||
          (pending.state !== "approval-requested" && pending.state !== "approval-responded")
        ) {
          return part;
        }
        const response = sentOperations.find(
          (item) =>
            item.name === pending.name &&
            item.toolCallId === pending.toolCallId &&
            item.state === "approval-responded" &&
            item.approval?.id === pending.approval?.id &&
            typeof item.approval?.approved === "boolean"
        );
        if (!response || !sameProposal(pending.input, response.input)) {
          return part;
        }
        const decision = response.approval?.approved === true;
        if (pending.state === "approval-responded" && pending.approval.approved !== decision) {
          return part;
        }
        const input = OperationalTaskCompletionSchema.parse(pending.input);
        if (decision) {
          approved.set(pending.toolCallId, input);
        }
        return {
          ...part,
          state: "approval-responded",
          approval: { id: pending.approval.id, approved: decision },
        } as MessagePart;
      }),
    };
  });
  return { messages, approved };
}

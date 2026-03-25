import { v4 as uuidv4 } from "@lukeed/uuid";
import {
  ListCopilotThreadMessagesResponseSchema,
  RestaurantAiToolCardSchema,
  type RestaurantAiToolCard,
} from "@corely/contracts";
import { useAuthStore } from "@/stores/authStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const getHeaders = () => {
  const authClient = useAuthStore.getState().authClient;
  const user = useAuthStore.getState().user;
  const accessToken = authClient?.getAccessToken() ?? "";

  return {
    Authorization: accessToken ? `Bearer ${accessToken}` : "",
    "Content-Type": "application/json",
    "X-Workspace-Id": user?.workspaceId ?? "",
  };
};

const createThread = async () => {
  const response = await fetch(`${API_URL}/copilot/threads`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      title: "Restaurant POS Copilot",
      metadata: { module: "restaurant", channel: "pos" },
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create copilot thread (${response.status})`);
  }
  const data = (await response.json()) as { thread?: { id?: string } };
  const threadId = data.thread?.id;
  if (!threadId) {
    throw new Error("Missing copilot thread id");
  }
  return threadId;
};

const listMessages = async (threadId: string) => {
  const response = await fetch(`${API_URL}/copilot/threads/${threadId}/messages`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to load copilot thread messages (${response.status})`);
  }
  return ListCopilotThreadMessagesResponseSchema.parse(await response.json()).items;
};

const extractLastCard = (
  threadMessages: Array<{ parts?: unknown[] | undefined }>
): RestaurantAiToolCard | null => {
  for (const message of [...threadMessages].reverse()) {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of [...parts].reverse()) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const toolPart = part as {
        state?: string;
        output?: unknown;
        result?: unknown;
        input?: unknown;
      };
      const candidate =
        toolPart.state === "output-available"
          ? (toolPart.output ?? toolPart.result ?? toolPart.input)
          : undefined;
      const parsed = RestaurantAiToolCardSchema.safeParse(candidate);
      if (parsed.success) {
        return parsed.data;
      }
    }
  }
  return null;
};

export const runRestaurantCopilotPrompt = async (
  prompt: string
): Promise<{
  threadId: string;
  card: RestaurantAiToolCard | null;
}> => {
  const threadId = await createThread();
  const response = await fetch(`${API_URL}/copilot/chat`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "X-Idempotency-Key": `restaurant-copilot:${uuidv4()}`,
    },
    body: JSON.stringify({
      threadId,
      id: threadId,
      message: {
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
      requestData: {
        activeModule: "restaurant",
        locale: "en",
      },
      trigger: "submit-message",
    }),
  });
  if (!response.ok) {
    throw new Error(`Restaurant copilot request failed (${response.status})`);
  }

  await response.text();
  const messages = await listMessages(threadId);
  return {
    threadId,
    card: extractLastCard(messages),
  };
};

import type { Command } from "@corely/web-shared/shared/command-palette/types";

export { default as AssistantPage } from "./screens/AssistantPage";

export const commandContributions = (): Command[] => [
  {
    id: "module.assistant.new-thread",
    title: "New Assistant Thread",
    subtitle: "Start a new conversation with Assistant",
    keywords: ["copilot", "chat", "ai"],
    group: "General",
    run: ({ navigate }) => navigate("/assistant"),
  },
];

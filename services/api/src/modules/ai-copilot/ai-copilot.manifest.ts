import type { AppManifest } from "@corely/contracts";

export const aiCopilotAppManifest: AppManifest = {
  appId: "ai-copilot",
  name: "AI Assistant",
  tier: 2,
  version: "1.0.0",
  description: "AI-powered assistant",
  dependencies: [],
  capabilities: ["ai.copilot"],
  permissions: [],
  menu: [
    {
      id: "assistant",
      scope: "web",
      section: "assistant",
      labelKey: "nav.assistant",
      defaultLabel: "Assistant",
      route: "/assistant",
      icon: "Sparkles",
      order: 40,
    },
  ],
};

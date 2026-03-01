import React from "react";
import { AssistantPage } from "@corely/web-features/modules/assistant";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

export const assistantRoutes = (): FeatureRoute[] => [
  { path: "/assistant", element: <AssistantPage /> },
  { path: "/assistant/t/:threadId", element: <AssistantPage /> },
];

export const assistantNavItems: FeatureNavItem[] = [
  { id: "assistant", label: "Assistant", route: "/assistant", icon: "Bot" },
];

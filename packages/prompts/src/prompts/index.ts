import { copilotPrompts } from "./copilot";
import { inventoryPrompts } from "./inventory";
import { purchasingPrompts } from "./purchasing";
import { crmPrompts } from "./crm";
import { approvalPrompts } from "./approvals";
import { workflowPrompts } from "./workflows";

export const promptDefinitions = [
  ...copilotPrompts,
  ...inventoryPrompts,
  ...purchasingPrompts,
  ...crmPrompts,
  ...approvalPrompts,
  ...workflowPrompts,
];

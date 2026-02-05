import { copilotPrompts } from "./copilot";
import { inventoryPrompts } from "./inventory";
import { purchasingPrompts } from "./purchasing";
import { crmPrompts } from "./crm";
import { approvalPrompts } from "./approvals";
import { workflowPrompts } from "./workflows";
import { cmsPrompts } from "./cms";
import { websitePrompts } from "./website";

export const promptDefinitions = [
  ...copilotPrompts,
  ...inventoryPrompts,
  ...purchasingPrompts,
  ...crmPrompts,
  ...approvalPrompts,
  ...workflowPrompts,
  ...cmsPrompts,
  ...websitePrompts,
];

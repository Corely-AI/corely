import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildCrmAiToolsContext, type CrmAiToolDeps } from "./crm-tools.shared";
import { buildCrmPartyFromTextTools } from "./crm-party-from-text.tools";
import { buildCrmDealFromTextTools } from "./crm-deal-from-text.tools";
import { buildCrmFollowUpTools } from "./crm-follow-up.tools";

export const buildCrmAiTools = (deps: CrmAiToolDeps): DomainToolPort[] => {
  const toolsContext = buildCrmAiToolsContext(deps);

  return [
    ...buildCrmPartyFromTextTools(toolsContext),
    ...buildCrmDealFromTextTools(toolsContext),
    ...buildCrmFollowUpTools(toolsContext),
  ];
};

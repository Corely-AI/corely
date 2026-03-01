import { type Type } from "@nestjs/common";
import { LeadsController } from "./adapters/http/leads.controller";
import { DealsHttpController } from "./adapters/http/deals.controller";
import {
  ActivitiesHttpController,
  TimelineHttpController,
} from "./adapters/http/activities.controller";
import {
  CommunicationsHttpController,
  CommunicationsWebhookController,
} from "./adapters/http/communications.controller";
import { ChannelsHttpController } from "./adapters/http/channels.controller";
import { SequencesInternalController } from "./adapters/http/sequences-internal.controller";
import { SequencesHttpController } from "./adapters/http/sequences.controller";
import { AccountsHttpController } from "./adapters/http/accounts.controller";
import { CrmAiHttpController } from "./adapters/http/crm-ai.controller";
import { ChannelTemplatesHttpController } from "./adapters/http/channel-templates.controller";

export const CRM_HTTP_CONTROLLERS: Type<unknown>[] = [
  DealsHttpController,
  ActivitiesHttpController,
  TimelineHttpController,
  CommunicationsHttpController,
  CommunicationsWebhookController,
  ChannelsHttpController,
  LeadsController,
  SequencesInternalController,
  SequencesHttpController,
  AccountsHttpController,
  CrmAiHttpController,
  ChannelTemplatesHttpController,
];

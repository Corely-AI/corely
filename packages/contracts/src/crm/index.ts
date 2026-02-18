// Core types
export * from "./party.types";
export * from "./deal.types";
export * from "./activity.types";
export * from "./pipeline.types";
export * from "./channel.types";
export * from "./lead.types";
export * from "./account.types";
export * from "./create-lead.schema";
export * from "./convert-lead.schema";

// Party operations
// TODO: Add party operation schemas (create-party, update-party, list-parties, etc.)

// Deal operations
export * from "./create-deal.schema";
export * from "./update-deal.schema";
export * from "./sequence.types";
export * from "./set-account-custom-attributes.schema";
export * from "./move-deal-stage.schema";
export * from "./mark-deal-won.schema";
export * from "./mark-deal-lost.schema";
export * from "./list-deals.schema";
export * from "./get-deal.schema";

// Activity operations
export * from "./create-activity.schema";
export * from "./complete-activity.schema";
export * from "./get-timeline.schema";
export * from "./update-activity.schema";
export * from "./list-activities.schema";
export * from "./log-message.schema";
export * from "./communications.schema";
export * from "./ai-crm.schema";

// AI Proposals
export * from "./ai-proposals/party-proposal.types";
export * from "./ai-proposals/deal-proposal.types";
export * from "./ai-proposals/activity-proposal.types";

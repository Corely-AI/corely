import { Injectable } from "@nestjs/common";
import type { ChannelDefinition } from "@corely/contracts";
import { PrismaService } from "@corely/data";

const PLACEHOLDER_WHITELIST = [
  "firstName",
  "lastName",
  "companyName",
  "dealTitle",
  "amount",
  "currency",
  "phoneE164",
  "email",
  "profileHandle",
  "profileUrl",
  // Support channel-specific profile placeholders like profileUrl_facebook, profileUrl_linkedin
  "profileUrl_*",
  "encodedMessage",
  "message",
  "subject",
];

const SAFE_SCHEMES = ["https://", "mailto:", "sms:"];

const DEFAULT_CHANNELS: ChannelDefinition[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    category: "MESSAGING",
    enabled: true,
    order: 1,
    iconKey: "whatsapp",
    defaultProviderKey: "meta",
    requiredContactFields: ["phoneE164"],
    capabilities: {
      canSendFromCRM: true,
      canReceiveInbound: true,
      hasDeliveryReceipts: true,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: false,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "deeplink",
      urlTemplate: "https://wa.me/{phoneE164}?text={encodedMessage}",
    },
    templates: [
      {
        id: "whatsapp-followup",
        name: "Follow-up",
        body: "Hi {firstName}, following up on {dealTitle}",
      },
    ],
  },
  {
    key: "sms",
    label: "SMS",
    category: "MESSAGING",
    enabled: true,
    order: 1.5,
    iconKey: "message-square",
    defaultProviderKey: "twilio",
    requiredContactFields: ["phoneE164"],
    capabilities: {
      canSendFromCRM: true,
      canReceiveInbound: true,
      hasDeliveryReceipts: true,
      supportsThreads: false,
      supportsAttachments: false,
      manualOnly: false,
      open: false,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "deeplink",
      urlTemplate: "sms:{phoneE164}?body={encodedMessage}",
    },
    templates: [],
  },
  {
    key: "in_app",
    label: "In-App",
    category: "INTERNAL",
    enabled: true,
    order: 1.6,
    iconKey: "message-circle",
    requiredContactFields: [],
    capabilities: {
      canSendFromCRM: true,
      canReceiveInbound: true,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: true,
      manualOnly: false,
      open: false,
      copy: true,
      log: true,
      subject: false,
      attachments: true,
    },
    action: {
      type: "deeplink",
      urlTemplate: "https://app.corely.one/inbox?message={encodedMessage}",
    },
    templates: [],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    category: "SOCIAL",
    enabled: true,
    order: 2,
    iconKey: "linkedin",
    requiredContactFields: ["profileUrl_linkedin"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_linkedin}",
    },
    templates: [
      {
        id: "linkedin-intro",
        name: "Intro",
        body: "Hi {firstName}, great to connect about {dealTitle}.",
      },
    ],
  },
  {
    key: "facebook_messenger",
    label: "Facebook Messenger",
    category: "SOCIAL",
    enabled: true,
    order: 2.5,
    iconKey: "message-circle",
    requiredContactFields: ["profileUrl_facebook_messenger"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_facebook_messenger}",
    },
    templates: [
      {
        id: "facebook-messenger-intro",
        name: "Intro",
        body: "Hi {firstName}, reaching out regarding {dealTitle}.",
      },
    ],
  },
  {
    key: "instagram_dm",
    label: "Instagram DM",
    category: "SOCIAL",
    enabled: true,
    order: 2.6,
    iconKey: "instagram",
    requiredContactFields: ["profileUrl_instagram_dm"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_instagram_dm}",
    },
    templates: [],
  },
  {
    key: "x_dm",
    label: "X DM",
    category: "SOCIAL",
    enabled: true,
    order: 2.7,
    iconKey: "send",
    requiredContactFields: ["profileUrl_x_dm"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_x_dm}",
    },
    templates: [],
  },
  {
    key: "telegram",
    label: "Telegram",
    category: "SOCIAL",
    enabled: true,
    order: 2.8,
    iconKey: "message-circle",
    requiredContactFields: ["profileUrl_telegram"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_telegram}",
    },
    templates: [],
  },
  {
    key: "wechat",
    label: "WeChat",
    category: "SOCIAL",
    enabled: true,
    order: 2.9,
    iconKey: "message-circle",
    requiredContactFields: ["profileUrl_wechat"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_wechat}",
    },
    templates: [],
  },
  {
    key: "line",
    label: "LINE",
    category: "SOCIAL",
    enabled: true,
    order: 3,
    iconKey: "message-circle",
    requiredContactFields: ["profileUrl_line"],
    capabilities: {
      canSendFromCRM: false,
      canReceiveInbound: false,
      hasDeliveryReceipts: false,
      supportsThreads: true,
      supportsAttachments: false,
      manualOnly: true,
      open: true,
      copy: true,
      log: true,
      subject: false,
      attachments: false,
    },
    action: {
      type: "profileUrl",
      urlTemplate: "{profileUrl_line}",
    },
    templates: [],
  },
  {
    key: "email",
    label: "Email",
    category: "EMAIL",
    enabled: true,
    order: 4,
    iconKey: "email",
    defaultProviderKey: "resend",
    requiredContactFields: ["email"],
    capabilities: {
      canSendFromCRM: true,
      canReceiveInbound: true,
      hasDeliveryReceipts: true,
      supportsThreads: true,
      supportsAttachments: true,
      manualOnly: false,
      open: true,
      copy: true,
      log: true,
      subject: true,
      attachments: true,
    },
    action: {
      type: "mailto",
      urlTemplate: "mailto:{email}?subject={subject}&body={encodedMessage}",
    },
    templates: [
      {
        id: "email-proposal",
        name: "Proposal",
        subject: "Proposal for {dealTitle}",
        body: "Hi {firstName}, please find details about {dealTitle}.",
      },
    ],
  },
];

function validatePlaceholders(template: string) {
  const matches = template.match(/{([^}]+)}/g) || [];
  for (const match of matches) {
    const key = match.replace(/[{}]/g, "");
    const isProfileSpecific = key.startsWith("profileUrl_");
    if (!isProfileSpecific && !PLACEHOLDER_WHITELIST.includes(key)) {
      throw new Error(`Invalid placeholder: ${key}`);
    }
  }
}

function validateUrlTemplate(url: string) {
  const lower = url.toLowerCase();
  const startsWithPlaceholder = lower.startsWith("{");
  if (!startsWithPlaceholder && !SAFE_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    throw new Error("Only https and mailto schemes are allowed");
  }
  validatePlaceholders(url);
}

@Injectable()
export class ChannelCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getChannels(): Promise<ChannelDefinition[]> {
    let rows: Array<{
      key: string;
      displayName: string;
      category: "EMAIL" | "MESSAGING" | "SOCIAL" | "INTERNAL";
      capabilities: unknown;
      defaultProviderKey: string | null;
      enabled: boolean;
    }> | null = null;

    try {
      rows = await this.prisma.channelRegistry.findMany({
        where: { enabled: true },
        orderBy: { key: "asc" },
      });
    } catch {
      rows = null;
    }

    const defaultsByKey = new Map(DEFAULT_CHANNELS.map((channel) => [channel.key, channel]));
    const source = rows && rows.length ? rows : null;

    const channels = source
      ? source.map((row) => {
          const fallback = defaultsByKey.get(row.key);
          return {
            key: row.key,
            label: row.displayName,
            category: row.category,
            enabled: row.enabled,
            order: fallback?.order ?? 100,
            iconKey: fallback?.iconKey,
            requiredContactFields: fallback?.requiredContactFields ?? [],
            defaultProviderKey: row.defaultProviderKey ?? fallback?.defaultProviderKey,
            capabilities: {
              ...(fallback?.capabilities ?? {
                canSendFromCRM: false,
                canReceiveInbound: false,
                hasDeliveryReceipts: false,
                supportsThreads: false,
                supportsAttachments: false,
                manualOnly: true,
                open: true,
                copy: true,
                log: true,
                subject: false,
                attachments: false,
              }),
              ...(typeof row.capabilities === "object" && row.capabilities ? row.capabilities : {}),
            },
            action: fallback?.action ?? {
              type: "profileUrl",
              urlTemplate: "{profileUrl}",
            },
            templates: fallback?.templates ?? [],
          } satisfies ChannelDefinition;
        })
      : DEFAULT_CHANNELS;

    for (const channel of channels) {
      validateUrlTemplate(channel.action.urlTemplate);
    }
    return channels;
  }
}

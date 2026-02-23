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
  "profileUrl_*",
  "encodedMessage",
  "message",
  "subject",
];

type TemplateContext = Record<string, string | undefined | null>;

const normalizePhoneForDeepLink = (phone: string | undefined | null): string | undefined => {
  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, "");
  return digits || undefined;
};

export const interpolateTemplate = (
  template: string,
  ctx: TemplateContext,
  channelKey?: string
): string => {
  return template.replace(/{([^}]+)}/g, (match, key: string) => {
    const isProfileSpecific = key.startsWith("profileUrl_");
    if (!isProfileSpecific && !PLACEHOLDER_WHITELIST.includes(key)) {
      return match;
    }
    if (isProfileSpecific) {
      const specific = ctx[key];
      if (specific) {
        return String(specific);
      }
      if (channelKey) {
        const fallbackKey = `profileUrl_${channelKey}`;
        if (ctx[fallbackKey]) {
          return String(ctx[fallbackKey]);
        }
      }
      if (ctx.profileUrl) {
        return String(ctx.profileUrl);
      }
    }
    const value = ctx[key];
    return value ? String(value) : "";
  });
};

export const buildChannelUrl = (
  urlTemplate: string,
  ctx: TemplateContext,
  channelKey?: string
): string => {
  const normalizedContext: TemplateContext = {
    ...ctx,
    phoneE164: normalizePhoneForDeepLink(ctx.phoneE164) ?? ctx.phoneE164,
  };

  return interpolateTemplate(urlTemplate, normalizedContext, channelKey);
};

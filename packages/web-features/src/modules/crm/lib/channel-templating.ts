const PLACEHOLDER_WHITELIST = [
  "fullName",
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
type HttpUrl = URL;

const normalizePhoneForDeepLink = (phone: string | undefined | null): string | undefined => {
  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, "");
  return digits || undefined;
};

const parseHttpUrl = (value: string): HttpUrl | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed;
    }
  } catch {
    // fall through to https-prefixed parse
  }

  try {
    const parsed = new URL(`https://${trimmed}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
};

const appendQueryParam = (url: string, key: string, value: string | undefined | null): string => {
  if (!value) {
    return url;
  }
  const parsed = parseHttpUrl(url);
  if (!parsed) {
    return url;
  }
  if (!parsed.searchParams.has(key)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
};

const getPathSegments = (url: HttpUrl): string[] =>
  url.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => Boolean(segment));

const toFacebookMessengerUrl = (input: string, message: string | undefined | null): string => {
  const parsed = parseHttpUrl(input);
  if (!parsed) {
    return input;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const segments = getPathSegments(parsed);

  if (host === "m.me" && segments[0]) {
    return appendQueryParam(`https://m.me/${segments[0]}`, "text", message);
  }

  if (host.endsWith("facebook.com")) {
    const [first = "", second = "", third = ""] = segments;
    const lowerFirst = first.toLowerCase();
    const blockedRoots = new Set([
      "pages",
      "people",
      "groups",
      "events",
      "marketplace",
      "watch",
      "reel",
      "reels",
      "share",
      "messages",
      "gaming",
      "help",
      "privacy",
      "about",
      "settings",
    ]);

    let identifier: string | null = null;
    if (lowerFirst === "profile.php") {
      identifier = parsed.searchParams.get("id");
    } else if (lowerFirst === "messages" && second.toLowerCase() === "t" && third) {
      identifier = third;
    } else if (first && !blockedRoots.has(lowerFirst)) {
      identifier = first;
    }

    if (identifier) {
      return appendQueryParam(`https://m.me/${identifier}`, "text", message);
    }
  }

  return appendQueryParam(input, "text", message);
};

const toInstagramDmUrl = (input: string): string => {
  const parsed = parseHttpUrl(input);
  if (!parsed) {
    return input;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const segments = getPathSegments(parsed);

  if (host === "ig.me" && segments[0]?.toLowerCase() === "m" && segments[1]) {
    return `https://ig.me/m/${segments[1]}`;
  }

  if (host === "instagram.com") {
    const [first = "", second = ""] = segments;
    const lowerFirst = first.toLowerCase();
    if (lowerFirst === "m" && second) {
      return `https://ig.me/m/${second}`;
    }
    const blockedRoots = new Set([
      "direct",
      "accounts",
      "p",
      "reel",
      "explore",
      "stories",
      "about",
      "legal",
      "developer",
      "challenge",
    ]);
    if (first && !blockedRoots.has(lowerFirst)) {
      return `https://ig.me/m/${first}`;
    }
  }

  return input;
};

const toXDmUrl = (input: string, message: string | undefined | null): string => {
  const parsed = parseHttpUrl(input);
  if (!parsed) {
    return input;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "x.com" && host !== "twitter.com") {
    return input;
  }

  const normalized = new URL(parsed.toString());
  normalized.hostname = "x.com";
  const path = normalized.pathname.replace(/\/+$/, "");
  if (path === "/messages/compose") {
    if (message && !normalized.searchParams.has("text")) {
      normalized.searchParams.set("text", message);
    }
    return normalized.toString();
  }

  return normalized.toString();
};

const toTelegramUrl = (input: string): string => {
  const parsed = parseHttpUrl(input);
  if (!parsed) {
    return input;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "t.me" && host !== "telegram.me") {
    return input;
  }

  const segments = getPathSegments(parsed);
  return segments[0] ? `https://t.me/${segments[0]}` : "https://t.me";
};

const buildLineOaMessageUrl = (accountId: string, message: string | undefined | null): string => {
  let normalizedAccount = accountId.trim();
  try {
    normalizedAccount = decodeURIComponent(normalizedAccount).trim();
  } catch {
    // Keep original when accountId is not a valid URI-encoded segment.
  }
  if (!normalizedAccount) {
    return "https://line.me";
  }
  const encodedAccount = encodeURIComponent(normalizedAccount);
  if (!message) {
    return `https://line.me/R/oaMessage/${encodedAccount}/`;
  }
  return `https://line.me/R/oaMessage/${encodedAccount}/?${encodeURIComponent(message)}`;
};

const toLineUrl = (input: string, message: string | undefined | null): string => {
  const parsed = parseHttpUrl(input);
  if (!parsed) {
    return input;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "line.me") {
    return input;
  }

  const segments = getPathSegments(parsed);
  const [first = "", second = "", third = "", fourth = ""] = segments;
  if (first === "R" && second === "oaMessage" && third) {
    return buildLineOaMessageUrl(third, message);
  }
  if (first === "R" && second === "ti" && third === "p" && fourth) {
    return buildLineOaMessageUrl(fourth, message);
  }
  if (first === "ti" && second === "p" && third) {
    return buildLineOaMessageUrl(third, message);
  }

  const id = parsed.searchParams.get("id");
  if (id && id.startsWith("@")) {
    return buildLineOaMessageUrl(id, message);
  }

  return input;
};

const applyChannelDeepLinkRules = (
  url: string,
  channelKey: string | undefined,
  ctx: TemplateContext
): string => {
  const message = ctx.message ?? null;
  switch (channelKey) {
    case "facebook_messenger":
      return toFacebookMessengerUrl(url, message);
    case "instagram_dm":
      return toInstagramDmUrl(url);
    case "x_dm":
      return toXDmUrl(url, message);
    case "telegram":
      return toTelegramUrl(url);
    case "line":
      return toLineUrl(url, message);
    default:
      return url;
  }
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

  const interpolatedUrl = interpolateTemplate(urlTemplate, normalizedContext, channelKey);
  return applyChannelDeepLinkRules(interpolatedUrl, channelKey, normalizedContext);
};

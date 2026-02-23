import { describe, expect, it } from "vitest";
import { buildChannelUrl } from "./channel-templating";

describe("buildChannelUrl", () => {
  it("normalizes phoneE164 placeholders to digits for deep links", () => {
    const url = buildChannelUrl("https://wa.me/{phoneE164}?text={encodedMessage}", {
      phoneE164: "+49 1520 7023822",
      encodedMessage: "Hi%20Hana",
    });

    expect(url).toBe("https://wa.me/4915207023822?text=Hi%20Hana");
  });

  it("keeps non-phone placeholders unchanged", () => {
    const url = buildChannelUrl("mailto:{email}?subject={subject}&body={encodedMessage}", {
      email: "hana@example.com",
      subject: "Hello",
      encodedMessage: "Hi%20Hana",
    });

    expect(url).toBe("mailto:hana@example.com?subject=Hello&body=Hi%20Hana");
  });

  it("builds facebook messenger deep link and prefills text", () => {
    const url = buildChannelUrl(
      "{profileUrl_facebook_messenger}",
      {
        profileUrl_facebook_messenger: "https://www.facebook.com/hana.beauty.nails",
        message: "Hi Hana",
      },
      "facebook_messenger"
    );

    expect(url).toBe("https://m.me/hana.beauty.nails?text=Hi+Hana");
  });

  it("normalizes instagram profile URL to ig.me DM link", () => {
    const url = buildChannelUrl(
      "{profileUrl_instagram_dm}",
      {
        profileUrl_instagram_dm: "https://www.instagram.com/hana_beauty/",
      },
      "instagram_dm"
    );

    expect(url).toBe("https://ig.me/m/hana_beauty");
  });

  it("adds text for X compose links when recipient_id exists", () => {
    const url = buildChannelUrl(
      "{profileUrl_x_dm}",
      {
        profileUrl_x_dm: "https://twitter.com/messages/compose?recipient_id=12345",
        message: "Hello from Corely",
      },
      "x_dm"
    );

    expect(url).toBe("https://x.com/messages/compose?recipient_id=12345&text=Hello+from+Corely");
  });

  it("normalizes telegram domain for user chat links", () => {
    const url = buildChannelUrl(
      "{profileUrl_telegram}",
      {
        profileUrl_telegram: "https://telegram.me/durov",
      },
      "telegram"
    );

    expect(url).toBe("https://t.me/durov");
  });

  it("builds LINE OA message deep link with text from profile URL", () => {
    const url = buildChannelUrl(
      "{profileUrl_line}",
      {
        profileUrl_line: "https://line.me/R/ti/p/@linedevelopers",
        message: "Hello LINE",
      },
      "line"
    );

    expect(url).toBe("https://line.me/R/oaMessage/%40linedevelopers/?Hello%20LINE");
  });
});

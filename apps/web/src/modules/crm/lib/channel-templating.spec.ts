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
});

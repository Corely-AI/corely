import { describe, expect, it } from "vitest";
import { isCustomDomainHost } from "@corely/web-shared/lib/domain-helper";

describe("domain helper localhost surfaces", () => {
  it("treats known localhost surface subdomains as app hosts", () => {
    expect(isCustomDomainHost("crm.localhost")).toBe(false);
    expect(isCustomDomainHost("pos.localhost")).toBe(false);
    expect(isCustomDomainHost("restaurant.localhost")).toBe(false);
  });

  it("keeps unknown localhost subdomains available for custom-domain flows", () => {
    expect(isCustomDomainHost("portfolio.localhost")).toBe(true);
  });
});

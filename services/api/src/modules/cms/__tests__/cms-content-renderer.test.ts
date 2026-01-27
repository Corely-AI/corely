import { describe, expect, it } from "vitest";
import { CmsContentRenderer } from "../application/services/cms-content-renderer.service";

describe("CmsContentRenderer", () => {
  it("renders HTML and extracts text from Tiptap JSON", () => {
    const renderer = new CmsContentRenderer();
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Hello World" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is a test." }],
        },
      ],
    };

    const result = renderer.render(doc);
    expect(result.html).toContain("<h2");
    expect(result.html).toContain("Hello World");
    expect(result.html).toContain("<p");
    expect(result.text).toContain("Hello World");
    expect(result.text).toContain("This is a test.");
  });

  it("sanitizes unsafe HTML while allowing images and safe links", () => {
    const renderer = new CmsContentRenderer();
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Click me",
              marks: [
                {
                  type: "link",
                  attrs: { href: "javascript:alert(1)" },
                },
              ],
            },
          ],
        },
        {
          type: "image",
          attrs: {
            src: "https://example.com/image.png",
            alt: "Example image",
            onerror: "alert(1)",
          },
        },
      ],
    };

    const result = renderer.render(doc);
    expect(result.html).toContain("https://example.com/image.png");
    expect(result.html).toContain("alt=\"Example image\"");
    expect(result.html).not.toContain("onerror");
    expect(result.html).not.toContain("javascript:");
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { RunRichTextAiUseCase } from "../run-richtext-ai.usecase";
import { RichTextAiRequest } from "@corely/contracts";
import { generateText } from "ai";
import * as sanitizeHtml from "sanitize-html";

// Mock 'ai' module
// Note: We used 'import { generateText } from "ai"' in source, so we mock it using vi.mock
vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock 'sanitize-html'
vi.mock("sanitize-html", () => ({
  default: vi.fn((html) => html), // identity by default
}));

// Mock providers
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mock-openai-model"),
}));

// Mock prompts package
vi.mock("@corely/prompts", () => ({
  RICH_TEXT_SYSTEM_PROMPT: "mock-system-prompt",
  buildRichTextUserPrompt: vi.fn().mockReturnValue("mock-user-prompt"),
}));

describe("RunRichTextAiUseCase", () => {
  let useCase: RunRichTextAiUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RunRichTextAiUseCase],
    }).compile();

    useCase = module.get<RunRichTextAiUseCase>(RunRichTextAiUseCase);
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(useCase).toBeDefined();
  });

  describe("executeBlocking", () => {
    const mockRequest: RichTextAiRequest = {
      presetId: "rental-description",
      operation: "generate",
      fullHtml: "",
      allowedTags: ["p"],
      allowLinks: false,
    };

    it("should call generateText and return parsed response", async () => {
      const mockResponse = {
        mode: "replace_all",
        html: "<p>Generated content</p>",
        summary: "Generated new content",
        warnings: [],
        followUpQuestions: [],
      };

      (generateText as any).mockResolvedValue({
        text: JSON.stringify(mockResponse),
      });

      const result = await useCase.executeBlocking(mockRequest);

      expect(generateText).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("should handle markdown code blocks in AI response", async () => {
      const mockResponse = {
        mode: "replace_all",
        html: "<p>Clean content</p>",
        summary: "Cleaned",
        warnings: [],
        followUpQuestions: [],
      };

      (generateText as any).mockResolvedValue({
        text: "```json\n" + JSON.stringify(mockResponse) + "\n```",
      });

      const result = await useCase.executeBlocking(mockRequest);

      expect(result).toEqual(mockResponse);
    });

    it("should throw error if response is not valid JSON", async () => {
      (generateText as any).mockResolvedValue({
        text: "Not JSON",
      });

      await expect(useCase.executeBlocking(mockRequest)).rejects.toThrow(
        "AI response was not valid JSON"
      );
    });

    it("should sanitize HTML output", async () => {
      const mockResponse = {
        mode: "replace_all",
        html: '<script>alert("xss")</script><p>Safe</p>',
        summary: "Attempted XSS",
        warnings: [],
        followUpQuestions: [],
      };

      (generateText as any).mockResolvedValue({
        text: JSON.stringify(mockResponse),
      });

      // Mock sanitizeHtml to strip script
      (sanitizeHtml.default as any).mockImplementation((html: string) => {
        if (html.includes("<script>")) return "<p>Safe</p>";
        return html;
      });

      const result = await useCase.executeBlocking(mockRequest);

      expect(sanitizeHtml.default).toHaveBeenCalledWith(
        mockResponse.html,
        expect.objectContaining({ allowedTags: ["p"] })
      );
      expect(result.html).toBe("<p>Safe</p>");
      expect(result.warnings).toContain("Some content was removed during security sanitization.");
    });
  });
});

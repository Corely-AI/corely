import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ExternalServiceError } from "@corely/domain";
import { OpenAiSpeechToTextAdapter } from "../infrastructure/speech-to-text/openai-speech-to-text.adapter";

describe("OpenAiSpeechToTextAdapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "FormData",
      class {
        append() {}
      }
    );
    vi.stubGlobal(
      "Blob",
      class {
        constructor() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it("maps provider errors to ExternalServiceError", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "bad gateway",
    } as any);

    const adapter = new OpenAiSpeechToTextAdapter("test-key", 10);

    await expect(
      adapter.transcribe({ bytes: Buffer.from("x"), contentType: "audio/wav" })
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });
});

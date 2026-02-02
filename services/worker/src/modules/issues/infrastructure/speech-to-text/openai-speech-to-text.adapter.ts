import { ExternalServiceError } from "@corely/domain";
import type { SpeechToTextPort, SpeechToTextResult } from "../../ports/speech-to-text.port";

const DEFAULT_MODEL = "gpt-4o-mini-transcribe" as const;

export class OpenAiSpeechToTextAdapter implements SpeechToTextPort {
  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs = 30000
  ) {}

  async transcribe(params: {
    bytes: Buffer;
    contentType: string;
    language?: string;
    model?: "gpt-4o-mini-transcribe" | "gpt-4o-transcribe";
  }): Promise<SpeechToTextResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const FormDataCtor = (globalThis as any).FormData as new () => any;
      const BlobCtor = (globalThis as any).Blob as new (parts: any[], options?: any) => any;
      if (!FormDataCtor || !BlobCtor) {
        throw new ExternalServiceError("FormData/Blob not available in this runtime", {
          code: "Issues:SpeechToTextUnsupportedRuntime",
          retryable: false,
        });
      }

      const form = new FormDataCtor();
      form.append("model", params.model ?? DEFAULT_MODEL);
      form.append("response_format", "verbose_json");
      if (params.language) {
        form.append("language", params.language);
      }
      const blob = new BlobCtor([params.bytes], { type: params.contentType });
      form.append("file", blob, "audio");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const retryable = response.status >= 500 || response.status === 429;
        throw new ExternalServiceError(`OpenAI transcription failed: ${errorText}`, {
          code: "Issues:SpeechToTextFailed",
          retryable,
        });
      }

      const payload = (await response.json()) as {
        text?: string;
        segments?: Array<{ start: number; end: number; text: string }>;
      };

      const segments = payload.segments?.map((segment) => ({
        startSeconds: segment.start,
        endSeconds: segment.end,
        text: segment.text,
      }));

      return {
        text: payload.text ?? "",
        segments,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown speech-to-text error";
      throw new ExternalServiceError(message, {
        code: "Issues:SpeechToTextFailed",
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

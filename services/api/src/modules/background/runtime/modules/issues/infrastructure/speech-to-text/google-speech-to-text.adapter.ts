import { ExternalServiceError } from "@corely/domain";
import { v2 } from "@google-cloud/speech";
import type {
  SpeechToTextPort,
  SpeechToTextResult,
  SpeechToTextSegment,
} from "../../ports/speech-to-text.port";

type GoogleSpeechToTextAdapterOptions = {
  projectId?: string;
  keyFilename?: string;
  location?: string;
  recognizerId?: string;
  timeoutMs?: number;
};

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type DurationLike =
  | { seconds?: number | string | null; nanos?: number | string | null }
  | string
  | null
  | undefined;

type WordInfoLike = {
  word?: string | null;
  startOffset?: DurationLike;
  endOffset?: DurationLike;
};

type AlternativeLike = {
  transcript?: string | null;
  words?: WordInfoLike[] | null;
};

type ResultLike = {
  alternatives?: AlternativeLike[] | null;
};

export class GoogleSpeechToTextAdapter implements SpeechToTextPort {
  private readonly client: v2.SpeechClient;
  private readonly projectId?: string;
  private readonly location: string;
  private readonly recognizerId: string;
  private readonly timeoutMs: number;

  constructor(options: GoogleSpeechToTextAdapterOptions) {
    const credentials = tryParseServiceAccount(options.keyFilename);
    this.projectId = options.projectId ?? credentials?.project_id;
    this.location = options.location ?? "global";
    this.recognizerId = options.recognizerId ?? "_";
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.client = new v2.SpeechClient({
      ...(this.projectId ? { projectId: this.projectId } : {}),
      ...(credentials ? { credentials } : {}),
      ...(!credentials && options.keyFilename ? { keyFilename: options.keyFilename } : {}),
    });
  }

  async transcribe(params: {
    bytes: Buffer;
    contentType: string;
    language?: string;
    model?: "gpt-4o-mini-transcribe" | "gpt-4o-transcribe";
  }): Promise<SpeechToTextResult> {
    void params.contentType;
    const projectId = await this.resolveProjectId();
    const recognizer = `projects/${projectId}/locations/${this.location}/recognizers/${this.recognizerId}`;

    try {
      const request = {
        recognizer,
        config: {
          autoDecodingConfig: {},
          languageCodes: params.language ? [params.language] : undefined,
          features: {
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true,
          },
        },
        content: params.bytes,
      };

      const [response] = await this.client.recognize(request, { timeout: this.timeoutMs });
      const results = (response.results ?? []) as ResultLike[];

      const transcriptParts: string[] = [];
      const segments: SpeechToTextSegment[] = [];

      for (const result of results) {
        const alternative = result.alternatives?.[0];
        if (!alternative) {
          continue;
        }
        if (alternative.transcript) {
          transcriptParts.push(alternative.transcript.trim());
        }

        const words = alternative.words ?? [];
        for (const word of words) {
          const startSeconds = toSeconds(word.startOffset);
          const endSeconds = toSeconds(word.endOffset);
          if (startSeconds === undefined || endSeconds === undefined) {
            continue;
          }
          const text = word.word?.trim();
          if (!text) {
            continue;
          }
          segments.push({ startSeconds, endSeconds, text });
        }
      }

      return {
        text: transcriptParts.join(" ").trim(),
        segments: segments.length ? segments : undefined,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown speech-to-text error";
      throw new ExternalServiceError(message, {
        code: "Issues:SpeechToTextFailed",
        retryable: isRetryableGoogleError(error),
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  private async resolveProjectId(): Promise<string> {
    if (this.projectId) {
      return this.projectId;
    }

    try {
      const resolved = await this.client.getProjectId();
      if (!resolved) {
        throw new Error("Google project id not available");
      }
      return resolved;
    } catch (error) {
      throw new ExternalServiceError("Google project id is required for speech-to-text", {
        code: "Issues:SpeechToTextFailed",
        retryable: false,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}

const toSeconds = (value: DurationLike): number | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const numeric = trimmed.endsWith("s") ? trimmed.slice(0, -1) : trimmed;
    const parsed = Number.parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  const secondsRaw = value.seconds ?? 0;
  const nanosRaw = value.nanos ?? 0;
  const seconds =
    typeof secondsRaw === "string" ? Number.parseInt(secondsRaw, 10) : Number(secondsRaw);
  const nanos = typeof nanosRaw === "string" ? Number.parseInt(nanosRaw, 10) : Number(nanosRaw);
  if (!Number.isFinite(seconds) && !Number.isFinite(nanos)) {
    return undefined;
  }
  return (Number.isFinite(seconds) ? seconds : 0) + (Number.isFinite(nanos) ? nanos : 0) / 1e9;
};

const isRetryableGoogleError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return true;
  }
  const codeValue = (error as { code?: number | string }).code;
  const code = typeof codeValue === "string" ? Number.parseInt(codeValue, 10) : codeValue;
  if (!Number.isFinite(code)) {
    return true;
  }
  return [4, 8, 13, 14].includes(code as number);
};

const tryParseServiceAccount = (value?: string): ServiceAccountLike | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as ServiceAccountLike;
  } catch {
    return undefined;
  }
};

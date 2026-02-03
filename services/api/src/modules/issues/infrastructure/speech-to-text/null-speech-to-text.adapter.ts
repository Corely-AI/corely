import { ExternalServiceError } from "@corely/domain";
import type {
  SpeechToTextPort,
  SpeechToTextResult,
} from "../../application/ports/speech-to-text.port";

export class NullSpeechToTextAdapter implements SpeechToTextPort {
  async transcribe(): Promise<SpeechToTextResult> {
    throw new ExternalServiceError("Speech-to-text provider is not configured", {
      code: "Issues:SpeechToTextMissing",
      retryable: false,
    });
  }
}

export type SpeechToTextSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type SpeechToTextResult = {
  text: string;
  segments?: SpeechToTextSegment[];
};

export interface SpeechToTextPort {
  transcribe(params: {
    bytes: Buffer;
    contentType: string;
    language?: string;
    model?: "gpt-4o-mini-transcribe" | "gpt-4o-transcribe";
  }): Promise<SpeechToTextResult>;
}

export const SPEECH_TO_TEXT_PORT = "worker/issues/speech-to-text-port";

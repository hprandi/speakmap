import type { SpeechLanguage } from "./SpeechLanguage";

export interface Transcriber {
  isSupported(): boolean;
  start(language: SpeechLanguage): void;
  stop(): Promise<string>;
  cancel(): void;
}

export type TranscriptionErrorReason =
  | "unsupported"
  | "microphone-denied"
  | "microphone-unavailable"
  | "network"
  | "unknown";

/** Rejection reason of `Transcriber.stop()`, turned into a user message by the Orchestrator. */
export class TranscriptionError extends Error {
  readonly reason: TranscriptionErrorReason;

  constructor(reason: TranscriptionErrorReason, message: string = reason) {
    super(message);
    this.name = "TranscriptionError";
    this.reason = reason;
  }
}

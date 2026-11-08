import type { SpeechLanguage } from "./SpeechLanguage";

export interface Transcriber {
  isSupported(): boolean;
  start(language: SpeechLanguage): void;
  stop(): Promise<string>;
  cancel(): void;
}

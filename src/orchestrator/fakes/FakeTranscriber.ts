import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import type { Transcriber } from "../../domain/Transcriber";
import { deferred } from "./Deferred";

export class FakeTranscriber implements Transcriber {
  startedWith: SpeechLanguage[] = [];
  transcript = deferred<string>();

  isSupported(): boolean {
    return true;
  }
  start(language: SpeechLanguage): void {
    this.startedWith.push(language);
  }
  stop(): Promise<string> {
    return this.transcript.promise;
  }
  cancel(): void {}
}

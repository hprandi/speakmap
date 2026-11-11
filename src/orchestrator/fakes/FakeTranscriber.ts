import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import type { Transcriber } from "../../domain/Transcriber";
import { deferred } from "./Deferred";

export class FakeTranscriber implements Transcriber {
  startedWith: SpeechLanguage[] = [];
  cancelCount = 0;
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
  cancel(): void {
    this.cancelCount += 1;
  }
}

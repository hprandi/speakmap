import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import { TranscriptionError, type Transcriber, type TranscriptionErrorReason } from "../../domain/Transcriber";

// TypeScript's DOM types do not include SpeechRecognition itself, so only what this class uses is declared here.
type RecognitionResultList = ArrayLike<ArrayLike<{ readonly transcript: string }> & { readonly isFinal: boolean }>;

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { readonly results: RecognitionResultList }) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type Session = { readonly recognition: SpeechRecognitionLike; readonly transcript: Promise<string> };

/** Error codes that mean "no transcript" rather than a failure. */
const NOT_FAILURES = new Set(["no-speech", "aborted"]);

const ERROR_REASONS: Record<string, TranscriptionErrorReason> = {
  "not-allowed": "microphone-denied",
  "service-not-allowed": "microphone-denied",
  "audio-capture": "microphone-unavailable",
  network: "network",
};

export class WebSpeechTranscriber implements Transcriber {
  private readonly Recognition: SpeechRecognitionConstructor | null;
  private session?: Session;

  /** `null` means the browser has no speech recognition. */
  constructor(Recognition: SpeechRecognitionConstructor | null = findSpeechRecognition()) {
    this.Recognition = Recognition;
  }

  isSupported(): boolean {
    return this.Recognition !== null;
  }

  start(language: SpeechLanguage): void {
    if (this.Recognition === null) {
      throw new TranscriptionError("unsupported", "Speech recognition is not supported in this browser.");
    }

    this.session?.recognition.abort();
    const recognition = new this.Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = false;

    this.session = { recognition, transcript: this.listen(recognition) };
    recognition.start();
  }

  stop(): Promise<string> {
    const session = this.session;
    if (session === undefined) return Promise.resolve("");

    this.session = undefined;
    session.recognition.stop();
    return session.transcript;
  }

  cancel(): void {
    this.session?.recognition.abort();
    this.session = undefined;
  }

  /** Settles when recognition ends, so final results that arrive after `stop()` are still included. */
  private listen(recognition: SpeechRecognitionLike): Promise<string> {
    const transcript = new Promise<string>((resolve, reject) => {
      let finalText = "";
      let failure: TranscriptionError | undefined;

      recognition.onresult = (event) => {
        finalText = this.joinFinalResults(event.results);
      };
      recognition.onerror = (event) => {
        if (!NOT_FAILURES.has(event.error)) failure = this.toError(event.error);
      };
      recognition.onend = () => (failure === undefined ? resolve(finalText) : reject(failure));
    });

    // A cancelled session may still fail; nobody awaits it, so the rejection must not be reported as unhandled.
    transcript.catch(() => {});
    return transcript;
  }

  /** In continuous mode every result event carries all results of the session so far. */
  private joinFinalResults(results: RecognitionResultList): string {
    const texts: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].isFinal) texts.push(results[i][0].transcript);
    }
    return texts.join(" ").replace(/\s+/g, " ").trim();
  }

  private toError(code: string): TranscriptionError {
    return new TranscriptionError(ERROR_REASONS[code] ?? "unknown", `Speech recognition failed: ${code}.`);
  }
}

function findSpeechRecognition(): SpeechRecognitionConstructor | null {
  const scope = globalThis as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

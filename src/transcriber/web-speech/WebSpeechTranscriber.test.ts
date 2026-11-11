import { beforeEach, describe, expect, it } from "vitest";
import { TranscriptionError } from "../../domain/Transcriber";
import { WebSpeechTranscriber, type SpeechRecognitionLike } from "./WebSpeechTranscriber";

class FakeRecognition implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];

  lang = "";
  continuous = false;
  interimResults = true;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onend: SpeechRecognitionLike["onend"] = null;
  started = false;
  stopped = false;
  aborted = false;
  private finals: string[] = [];

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start(): void {
    this.started = true;
  }
  stop(): void {
    this.stopped = true;
  }
  abort(): void {
    this.aborted = true;
  }

  /** Simulates a final result: like the browser, the event carries every result of the session so far. */
  say(text: string): void {
    this.finals.push(text);
    const results = this.finals.map((transcript) => Object.assign([{ transcript }], { isFinal: true }));
    this.onresult?.({ results });
  }
  fail(error: string): void {
    this.onerror?.({ error });
  }
  end(): void {
    this.onend?.();
  }
}

function lastRecognition(): FakeRecognition {
  const recognition = FakeRecognition.instances.at(-1);
  if (recognition === undefined) throw new Error("no recognition was created");
  return recognition;
}

describe("WebSpeechTranscriber", () => {
  let transcriber: WebSpeechTranscriber;

  beforeEach(() => {
    FakeRecognition.instances = [];
    transcriber = new WebSpeechTranscriber(FakeRecognition);
  });

  describe("Transcription in the selected language", () => {
    it("when starting, then recognition uses the given language, continuous and final results only", () => {
      transcriber.start("pt-BR");
      expect(lastRecognition()).toMatchObject({ lang: "pt-BR", continuous: true, interimResults: false, started: true });
    });

    it("when the language changes between utterances, then the next utterance uses the new language", async () => {
      transcriber.start("en-US");
      const first = transcriber.stop();
      lastRecognition().end();
      await first;
      transcriber.start("pt-BR");
      expect(lastRecognition().lang).toBe("pt-BR");
    });

    it("when recognition ends, then stop resolves with the final results joined", async () => {
      transcriber.start("en-US");
      lastRecognition().say("what about");
      lastRecognition().say(" a subscription");
      const transcript = transcriber.stop();
      lastRecognition().end();
      await expect(transcript).resolves.toBe("what about a subscription");
    });

    it("when a final result arrives after stop, then it is still included", async () => {
      transcriber.start("en-US");
      lastRecognition().say("add pricing");
      const transcript = transcriber.stop();
      expect(lastRecognition().stopped).toBe(true);
      lastRecognition().say("and audience");
      lastRecognition().end();
      await expect(transcript).resolves.toBe("add pricing and audience");
    });

    it("when recognition ended before stop, then stop resolves with what was heard", async () => {
      transcriber.start("en-US");
      lastRecognition().say("add pricing");
      lastRecognition().end();
      await expect(transcriber.stop()).resolves.toBe("add pricing");
    });
  });

  describe("Empty utterance is discarded", () => {
    it("when nothing was said, then stop resolves with an empty transcript", async () => {
      transcriber.start("en-US");
      const transcript = transcriber.stop();
      lastRecognition().end();
      await expect(transcript).resolves.toBe("");
    });

    it("when recognition reports no speech, then stop resolves with an empty transcript", async () => {
      transcriber.start("en-US");
      const transcript = transcriber.stop();
      lastRecognition().fail("no-speech");
      lastRecognition().end();
      await expect(transcript).resolves.toBe("");
    });

    it("when stop is called without start, then it resolves with an empty transcript", async () => {
      await expect(transcriber.stop()).resolves.toBe("");
    });
  });

  describe("Microphone permission failure is reported", () => {
    it("when microphone access is denied, then stop rejects with a microphone-denied error", async () => {
      transcriber.start("en-US");
      lastRecognition().fail("not-allowed");
      lastRecognition().end();
      const error = await transcriber.stop().catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(TranscriptionError);
      expect(error).toMatchObject({ reason: "microphone-denied" });
    });

    it("when no microphone is available, then stop rejects with a microphone-unavailable error", async () => {
      transcriber.start("en-US");
      const transcript = transcriber.stop();
      lastRecognition().fail("audio-capture");
      lastRecognition().end();
      await expect(transcript).rejects.toMatchObject({ reason: "microphone-unavailable" });
    });

    it("when the network fails, then stop rejects with a network error", async () => {
      transcriber.start("en-US");
      const transcript = transcriber.stop();
      lastRecognition().fail("network");
      lastRecognition().end();
      await expect(transcript).rejects.toMatchObject({ reason: "network" });
    });

    it("when an unexpected error happens, then stop rejects with an unknown error", async () => {
      transcriber.start("en-US");
      const transcript = transcriber.stop();
      lastRecognition().fail("language-not-supported");
      lastRecognition().end();
      await expect(transcript).rejects.toMatchObject({ reason: "unknown" });
    });
  });

  describe("Unsupported browser is reported", () => {
    it("when the browser has speech recognition, then it is supported", () => {
      expect(transcriber.isSupported()).toBe(true);
    });

    it("when the browser has no speech recognition, then it is not supported and start throws", () => {
      const unsupported = new WebSpeechTranscriber(null);
      expect(unsupported.isSupported()).toBe(false);
      expect(() => unsupported.start("en-US")).toThrow(TranscriptionError);
    });
  });

  describe("Cancel", () => {
    it("when cancelling, then recognition is aborted and a later stop resolves empty", async () => {
      transcriber.start("en-US");
      lastRecognition().say("add pricing");
      transcriber.cancel();
      expect(lastRecognition().aborted).toBe(true);
      await expect(transcriber.stop()).resolves.toBe("");
    });

    it("when starting while a session is open, then the old session is aborted", () => {
      transcriber.start("en-US");
      const first = lastRecognition();
      transcriber.start("en-US");
      expect(first.aborted).toBe(true);
      expect(FakeRecognition.instances).toHaveLength(2);
    });
  });
});

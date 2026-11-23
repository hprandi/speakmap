import type { Interpreter } from "../domain/Interpreter";
import type { SpeechLanguage } from "../domain/SpeechLanguage";
import type { Transcriber } from "../domain/Transcriber";
import type { GraphStore } from "../editor/GraphStore";
import type { Cycle } from "./Cycle";
import { ErrorMessages } from "./ErrorMessages";
import type { OrchestratorListener, OrchestratorState } from "./OrchestratorState";
import type { UtteranceLog } from "./utterance-log/UtteranceLog";
import type { UtteranceOutcome } from "./utterance-log/UtteranceLogEntry";

export type OrchestratorDependencies = {
  readonly transcriber: Transcriber;
  readonly interpreter: Interpreter;
  readonly graphStore: GraphStore;
  readonly utteranceLog: UtteranceLog;
};

export class Orchestrator {
  private readonly transcriber: Transcriber;
  private readonly interpreter: Interpreter;
  private readonly graphStore: GraphStore;
  private readonly utteranceLog: UtteranceLog;
  private readonly listeners = new Set<OrchestratorListener>();
  private readonly errorMessages = new ErrorMessages();
  private state: OrchestratorState = { status: "idle" };
  private cycle?: Cycle;

  constructor({ transcriber, interpreter, graphStore, utteranceLog }: OrchestratorDependencies) {
    this.transcriber = transcriber;
    this.interpreter = interpreter;
    this.graphStore = graphStore;
    this.utteranceLog = utteranceLog;
  }

  getState(): OrchestratorState {
    return this.state;
  }

  subscribe(listener: OrchestratorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  startCapture(language: SpeechLanguage): void {
    if (this.state.status !== "idle") return;

    const cycle: Cycle = {
      abortController: new AbortController(),
      language,
      graphBefore: this.graphStore.getGraph()
    };
    this.cycle = cycle;
    try {
      this.transcriber.start(language);
      this.setState({ status: "listening" });
    } catch (error) {
      this.fail(cycle, error);
    }
  }

  async stopCapture(): Promise<void> {
    const cycle = this.cycle;
    if (this.state.status !== "listening" || cycle === undefined) return;

    try {
      this.setState({ status: "transcribing" });
      const transcript = (await this.transcriber.stop()).trim();
      if (cycle !== this.cycle) return;
      if (transcript === "") {
        this.finish(cycle, "empty");
        return;
      }

      cycle.transcript = transcript;
      this.setState({ status: "interpreting", transcript });
      const result = await this.interpreter.interpret(
        transcript,
        this.graphStore.getGraph(),
        cycle.language,
        cycle.abortController.signal,
      );
      if (cycle !== this.cycle) return;
      cycle.interpretation = result;

      if ("error" in result) {
        this.finish(cycle, "interpretation-error", result.error.message);
        return;
      }

      const applied = this.graphStore.apply(result.operations);
      if (applied.ok) this.finish(cycle, "applied");
      else this.finish(cycle, "rejected", applied.reason);
    } catch (error) {
      if (cycle === this.cycle) this.fail(cycle, error);
    }
  }

  cancel(): void {
    const cycle = this.cycle;
    if (this.state.status === "idle" || cycle === undefined) return;

    this.transcriber.cancel();
    cycle.abortController.abort();
    this.cycle = undefined;
    this.finish(cycle, "cancelled");
  }

  private fail(cycle: Cycle, error: unknown): void {
    const outcome = cycle.transcript === undefined ? "transcription-error" : "interpretation-error";
    this.finish(cycle, outcome, this.errorMessages.of(error));
  }

  private finish(cycle: Cycle, outcome: UtteranceOutcome, reason?: string): void {
    this.utteranceLog.record(cycle, outcome, this.graphStore.getGraph(), reason);
    this.setState({ status: "idle", transcript: this.state.transcript, errorMessage: reason });
  }

  private setState(state: OrchestratorState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}

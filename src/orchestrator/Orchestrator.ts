import type { Interpreter } from "../domain/Interpreter";
import type { SpeechLanguage } from "../domain/SpeechLanguage";
import type { Transcriber } from "../domain/Transcriber";
import type { GraphStore } from "../editor/GraphStore";
import { ErrorMessages } from "./ErrorMessages";

export type CycleStatus = "idle" | "listening" | "transcribing" | "interpreting";

export type OrchestratorState = {
  readonly status: CycleStatus;
  readonly transcript?: string;
  readonly errorMessage?: string;
};

export type OrchestratorListener = (state: OrchestratorState) => void;

export type OrchestratorDependencies = {
  readonly transcriber: Transcriber;
  readonly interpreter: Interpreter;
  readonly graphStore: GraphStore;
};

export class Orchestrator {
  private readonly transcriber: Transcriber;
  private readonly interpreter: Interpreter;
  private readonly graphStore: GraphStore;
  private readonly listeners = new Set<OrchestratorListener>();
  private readonly errorMessages = new ErrorMessages();
  private state: OrchestratorState = { status: "idle" };
  private cycle?: { readonly controller: AbortController };
  private language: SpeechLanguage = "en-US";

  constructor({ transcriber, interpreter, graphStore }: OrchestratorDependencies) {
    this.transcriber = transcriber;
    this.interpreter = interpreter;
    this.graphStore = graphStore;
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

    try {
      this.language = language;
      this.cycle = { controller: new AbortController() };
      this.transcriber.start(language);
      this.setState({ status: "listening" });
    } catch (error) {
      this.fail(error);
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
        this.setState({ status: "idle", transcript: this.state.transcript });
        return;
      }

      this.setState({ status: "interpreting", transcript });
      const result = await this.interpreter.interpret(
        transcript,
        this.graphStore.getGraph(),
        this.language,
        cycle.controller.signal,
      );
      if (cycle !== this.cycle) return;

      if ("error" in result) {
        this.setState({ status: "idle", transcript, errorMessage: result.error.message });
        return;
      }

      const applied = this.graphStore.apply(result.operations);
      this.setState(applied.ok ? { status: "idle", transcript } : { status: "idle", transcript, errorMessage: applied.reason });
    } catch (error) {
      if (cycle === this.cycle) this.fail(error);
    }
  }

  /** Esc or the Cancel button: discards the current utterance and returns to idle. */
  cancel(): void {
    if (this.state.status === "idle") return;

    this.transcriber.cancel();
    this.cycle?.controller.abort();
    this.cycle = undefined;
    this.setState({ status: "idle", transcript: this.state.transcript });
  }

  private fail(error: unknown): void {
    this.setState({ status: "idle", transcript: this.state.transcript, errorMessage: this.errorMessages.of(error) });
  }

  private setState(state: OrchestratorState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}

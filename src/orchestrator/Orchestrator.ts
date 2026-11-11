import type { Interpreter } from "../domain/Interpreter";
import type { SpeechLanguage } from "../domain/SpeechLanguage";
import type { Transcriber } from "../domain/Transcriber";
import type { GraphStore } from "../editor/GraphStore";

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
  private state: OrchestratorState = { status: "idle" };
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
      this.transcriber.start(language);
      this.setState({ status: "listening" });
    } catch (error) {
      this.fail(error);
    }
  }

  async stopCapture(): Promise<void> {
    if (this.state.status !== "listening") return;

    try {
      this.setState({ status: "transcribing" });
      const transcript = (await this.transcriber.stop()).trim();
      if (transcript === "") {
        this.setState({ status: "idle", transcript: this.state.transcript });
        return;
      }

      this.setState({ status: "interpreting", transcript });
      const result = await this.interpreter.interpret(
        transcript,
        this.graphStore.getGraph(),
        this.language,
        new AbortController().signal,
      );

      if ("operations" in result) this.graphStore.apply(result.operations);
      this.setState({ status: "idle", transcript });
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    this.setState({ status: "idle", transcript: this.state.transcript, errorMessage });
  }

  private setState(state: OrchestratorState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}

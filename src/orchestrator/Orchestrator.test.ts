import { describe, expect, it, vi } from "vitest";
import { TranscriptionError } from "../domain/Transcriber";
import { GraphStore } from "../editor/GraphStore";
import { FakeInterpreter } from "./fakes/FakeInterpreter";
import { FakeTranscriber } from "./fakes/FakeTranscriber";
import { Orchestrator, type CycleStatus } from "./Orchestrator";

function setup() {
  const transcriber = new FakeTranscriber();
  const interpreter = new FakeInterpreter();
  const graphStore = new GraphStore();
  const orchestrator = new Orchestrator({ transcriber, interpreter, graphStore });
  const statuses: CycleStatus[] = [];
  orchestrator.subscribe((state) => statuses.push(state.status));
  return { transcriber, interpreter, graphStore, orchestrator, statuses };
}

/** Runs a cycle up to the interpreter call. The cycle is wrapped because awaiting a returned promise would wait for it. */
async function speakUntilInterpreting(context: ReturnType<typeof setup>, transcript: string) {
  context.orchestrator.startCapture("en-US");
  const cycle = context.orchestrator.stopCapture();
  context.transcriber.transcript.resolve(transcript);
  await vi.waitFor(() => expect(context.interpreter.calls).toHaveLength(1));
  return { cycle };
}

describe("Orchestrator", () => {
  describe("One utterance, one cycle", () => {
    it("when an utterance is spoken, then its operations are applied to the graph", async () => {
      const { transcriber, interpreter, graphStore, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.resolve("what about a subscription");
      await vi.waitFor(() => expect(interpreter.calls).toHaveLength(1));
      interpreter.result.resolve({ operations: [{ type: "add_node", text: "Subscription" }] });
      await cycle;
      expect(graphStore.getGraph().nodes).toEqual([{ id: 1, text: "Subscription" }]);
    });

    it("when interpreting, then the interpreter gets the transcript, the current graph and the language", async () => {
      const { transcriber, interpreter, graphStore, orchestrator } = setup();
      graphStore.apply([{ type: "add_node", text: "Product" }]);
      orchestrator.startCapture("pt-BR");
      void orchestrator.stopCapture();
      transcriber.transcript.resolve("what about a subscription");
      await vi.waitFor(() => expect(interpreter.calls).toHaveLength(1));
      expect(interpreter.calls[0]).toMatchObject({
        transcript: "what about a subscription",
        graph: graphStore.getGraph(),
        language: "pt-BR",
      });
    });

    it("when pressing, then the transcriber starts in the given language", () => {
      const { transcriber, orchestrator } = setup();
      orchestrator.startCapture("pt-BR");
      expect(transcriber.startedWith).toEqual(["pt-BR"]);
    });
  });

  describe("Status is always visible", () => {
    it("when created, then the status is idle", () => {
      expect(setup().orchestrator.getState().status).toBe("idle");
    });

    it("when a cycle runs, then the status goes idle, listening, transcribing, interpreting and back to idle", async () => {
      const { transcriber, interpreter, orchestrator, statuses } = setup();
      orchestrator.startCapture("en-US");
      expect(orchestrator.getState().status).toBe("listening");

      const cycle = orchestrator.stopCapture();
      expect(orchestrator.getState().status).toBe("transcribing");

      transcriber.transcript.resolve("what about a subscription");
      await vi.waitFor(() => expect(orchestrator.getState().status).toBe("interpreting"));

      interpreter.result.resolve({ operations: [{ type: "add_node", text: "Subscription" }] });
      await cycle;
      expect(statuses).toEqual(["listening", "transcribing", "interpreting", "idle"]);
    });

    it("when releasing without listening, then nothing happens", async () => {
      const { orchestrator, statuses } = setup();
      await orchestrator.stopCapture();
      expect(statuses).toEqual([]);
    });
  });

  describe("Last utterance is shown", () => {
    it("when the utterance is transcribed, then the state keeps its transcript", async () => {
      const { transcriber, interpreter, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.resolve("what about a subscription");
      await vi.waitFor(() => expect(orchestrator.getState().transcript).toBe("what about a subscription"));
      interpreter.result.resolve({ operations: [{ type: "add_node", text: "Subscription" }] });
      await cycle;
      expect(orchestrator.getState()).toEqual({ status: "idle", transcript: "what about a subscription" });
    });
  });

  describe("Push-to-talk is disabled while processing", () => {
    it("when capture starts while interpreting, then it is ignored and the status stays interpreting", async () => {
      const { transcriber, interpreter, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      void orchestrator.stopCapture();
      transcriber.transcript.resolve("what about a subscription");
      await vi.waitFor(() => expect(interpreter.calls).toHaveLength(1));
      orchestrator.startCapture("en-US");
      expect(transcriber.startedWith).toEqual(["en-US"]);
      expect(orchestrator.getState().status).toBe("interpreting");
    });

    it("when capture starts while transcribing, then it is ignored", () => {
      const { transcriber, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      void orchestrator.stopCapture();
      orchestrator.startCapture("en-US");
      expect(transcriber.startedWith).toEqual(["en-US"]);
      expect(orchestrator.getState().status).toBe("transcribing");
    });

    it("when capture starts while listening, then it is ignored", () => {
      const { transcriber, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      orchestrator.startCapture("en-US");
      expect(transcriber.startedWith).toEqual(["en-US"]);
    });
  });

  describe("Empty utterance is discarded", () => {
    it("when the transcript is empty, then nothing is interpreted and the status goes back to idle", async () => {
      const { transcriber, interpreter, graphStore, orchestrator } = setup();
      const before = graphStore.getGraph();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.resolve("");
      await cycle;
      expect(interpreter.calls).toHaveLength(0);
      expect(orchestrator.getState().status).toBe("idle");
      expect(graphStore.getGraph()).toBe(before);
    });
  });

  describe("Undo goes through the normal cycle", () => {
    it("when the interpreter returns undo, then the last utterance is reverted and the status goes back to idle", async () => {
      const { transcriber, interpreter, graphStore, orchestrator } = setup();
      graphStore.apply([{ type: "add_node", text: "Product" }]);
      graphStore.apply([{ type: "add_node", text: "Subscription" }]);
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.resolve("undo that");
      await vi.waitFor(() => expect(interpreter.calls).toHaveLength(1));
      interpreter.result.resolve({ operations: [{ type: "undo" }] });
      await cycle;
      expect(graphStore.getGraph().nodes.map((node) => node.id)).toEqual([1]);
      expect(orchestrator.getState().status).toBe("idle");
    });
  });

  describe("Errors leave the graph unchanged and the app usable", () => {
    it("when transcription fails, then the status goes back to idle and the graph is unchanged", async () => {
      const { transcriber, graphStore, orchestrator } = setup();
      const before = graphStore.getGraph();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.reject(new Error("microphone denied"));
      await cycle;
      expect(orchestrator.getState().status).toBe("idle");
      expect(graphStore.getGraph()).toBe(before);
    });

    it("when interpretation fails, then the status goes back to idle and the graph is unchanged", async () => {
      const { transcriber, interpreter, graphStore, orchestrator } = setup();
      const before = graphStore.getGraph();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.resolve("what about a subscription");
      await vi.waitFor(() => expect(interpreter.calls).toHaveLength(1));
      interpreter.result.reject(new Error("network"));
      await cycle;
      expect(orchestrator.getState().status).toBe("idle");
      expect(graphStore.getGraph()).toBe(before);
    });

    it("when starting fails, then the status stays idle", () => {
      const { transcriber, orchestrator } = setup();
      transcriber.start = () => {
        throw new Error("unsupported");
      };
      orchestrator.startCapture("en-US");
      expect(orchestrator.getState().status).toBe("idle");
    });

    it("when a cycle failed, then a new cycle can start", async () => {
      const { transcriber, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.reject(new Error("network"));
      await cycle;
      orchestrator.startCapture("en-US");
      expect(orchestrator.getState().status).toBe("listening");
    });
  });

  describe("Error messages", () => {
    it("when a step fails, then the user message for that failure is shown", async () => {
      const { transcriber, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      transcriber.transcript.reject(new TranscriptionError("microphone-denied"));
      await cycle;
      expect(orchestrator.getState().errorMessage).toBe(
        "Microphone access is required. Allow it in your browser and try again.",
      );
    });
  });

  describe("Cancel the current utterance", () => {
    it("when cancelling while listening, then recording stops, nothing is interpreted and the status is idle", async () => {
      const { transcriber, interpreter, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      orchestrator.cancel();
      await orchestrator.stopCapture();
      expect(transcriber.cancelCount).toBe(1);
      expect(interpreter.calls).toHaveLength(0);
      expect(orchestrator.getState().status).toBe("idle");
    });

    it("when cancelling while transcribing, then a late transcript is ignored", async () => {
      const { transcriber, interpreter, orchestrator } = setup();
      orchestrator.startCapture("en-US");
      const cycle = orchestrator.stopCapture();
      orchestrator.cancel();
      transcriber.transcript.resolve("what about a subscription");
      await cycle;
      expect(interpreter.calls).toHaveLength(0);
      expect(orchestrator.getState().status).toBe("idle");
    });

    it("when cancelling while interpreting, then the request is aborted and a late result leaves the graph unchanged", async () => {
      const context = setup();
      const before = context.graphStore.getGraph();
      const { cycle } = await speakUntilInterpreting(context, "what about a subscription");
      context.orchestrator.cancel();
      expect(context.interpreter.calls[0].signal.aborted).toBe(true);
      context.interpreter.result.resolve({ operations: [{ type: "add_node", text: "Subscription" }] });
      await cycle;
      expect(context.graphStore.getGraph()).toBe(before);
      expect(context.orchestrator.getState().status).toBe("idle");
    });

    it("when a cancelled interpretation fails afterwards, then no error is shown", async () => {
      const context = setup();
      const { cycle } = await speakUntilInterpreting(context, "what about a subscription");
      context.orchestrator.cancel();
      context.interpreter.result.reject(new Error("aborted"));
      await cycle;
      expect(context.orchestrator.getState().errorMessage).toBeUndefined();
    });
  });

  describe("Observable state", () => {
    it("when an observer unsubscribes, then it is no longer notified", () => {
      const { orchestrator } = setup();
      const listener = vi.fn();
      const unsubscribe = orchestrator.subscribe(listener);
      unsubscribe();
      orchestrator.startCapture("en-US");
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

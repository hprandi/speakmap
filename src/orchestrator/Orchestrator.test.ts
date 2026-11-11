import { describe, expect, it, vi } from "vitest";
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
      expect(interpreter.calls[0]).toEqual({
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

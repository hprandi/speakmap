import { describe, expect, it, vi } from "vitest";
import { EMPTY_GRAPH } from "../domain/Graph";
import type { Operation } from "../domain/Operation";
import { GraphStore } from "./GraphStore";

function add(text: string, parentId?: number): Operation {
  return parentId === undefined ? { type: "add_node", text } : { type: "add_node", text, parentId };
}

const undo: Operation = { type: "undo" };

// Utterances: [1], [2], [3], then one utterance with [4, 5].
function storeWithFiveNodes(): GraphStore {
  const store = new GraphStore();
  store.apply([add("Product")]);
  store.apply([add("Pricing")]);
  store.apply([add("Monthly")]);
  store.apply([add("Annual"), add("Audience", 1)]);
  return store;
}

describe("GraphStore", () => {
  describe("Graph starts empty", () => {
    it("when created, then the graph has no nodes and no focus", () => {
      expect(new GraphStore().getGraph()).toEqual(EMPTY_GRAPH);
    });
  });

  describe("Operations from one utterance apply all or nothing", () => {
    it("when operations are valid, then the graph is replaced", () => {
      const store = new GraphStore();
      const result = store.apply([add("Product")]);
      expect(result.ok).toBe(true);
      expect(store.getGraph().nodes).toEqual([{ id: 1, text: "Product" }]);
    });

    it("when operations are rejected, then the graph is unchanged and the reason is returned", () => {
      const store = storeWithFiveNodes();
      const before = store.getGraph();
      expect(store.apply([add("X", 9)])).toEqual({ ok: false, reason: "Node 9 does not exist." });
      expect(store.getGraph()).toBe(before);
    });

    it("when operations are rejected, then undo still reverts the last applied utterance", () => {
      const store = storeWithFiveNodes();
      store.apply([add("X", 9)]);
      store.apply([undo]);
      expect(store.getGraph().nodes.map((node) => node.id)).toEqual([1, 2, 3]);
    });
  });

  describe("Undo reverts the last utterance", () => {
    it("when the last utterance added two nodes, then undo removes both and restores the focus", () => {
      const store = storeWithFiveNodes();
      store.apply([undo]);
      expect(store.getGraph().nodes.map((node) => node.id)).toEqual([1, 2, 3]);
      expect(store.getGraph().focusId).toBe(3);
    });

    it("when a node was undone, then the next node reuses its id", () => {
      const store = storeWithFiveNodes();
      store.apply([undo]);
      store.apply([add("Discount")]);
      expect(store.getGraph().nodes.at(-1)?.id).toBe(4);
    });

    it("when undoing repeatedly, then each undo reverts the utterance before, back to the empty graph", () => {
      const store = storeWithFiveNodes();
      for (let i = 0; i < 4; i++) store.apply([undo]);
      expect(store.getGraph()).toEqual(EMPTY_GRAPH);
    });

    it("when undo comes with another operation, then it is rejected and the graph is unchanged", () => {
      const store = storeWithFiveNodes();
      const before = store.getGraph();
      expect(store.apply([undo, add("X")]).ok).toBe(false);
      expect(store.getGraph()).toBe(before);
    });

    it("when undo comes twice in one utterance, then it is rejected", () => {
      const store = storeWithFiveNodes();
      expect(store.apply([undo, undo]).ok).toBe(false);
    });

    it("when there is nothing to undo, then it is rejected and the graph is unchanged", () => {
      const store = new GraphStore();
      expect(store.apply([undo])).toEqual({ ok: false, reason: "There is nothing to undo." });
      expect(store.getGraph()).toEqual(EMPTY_GRAPH);
    });
  });

  describe("Graph changes are observable", () => {
    it("when an utterance is applied, then every observer receives the new graph", () => {
      const store = new GraphStore();
      const first = vi.fn();
      const second = vi.fn();
      store.subscribe(first);
      store.subscribe(second);
      store.apply([add("Product")]);
      expect(first).toHaveBeenCalledExactlyOnceWith(store.getGraph());
      expect(second).toHaveBeenCalledExactlyOnceWith(store.getGraph());
    });

    it("when an utterance is undone, then observers receive the restored graph", () => {
      const store = storeWithFiveNodes();
      const listener = vi.fn();
      store.subscribe(listener);
      store.apply([undo]);
      expect(listener).toHaveBeenCalledExactlyOnceWith(store.getGraph());
    });

    it("when a request is rejected, then observers are not notified", () => {
      const store = new GraphStore();
      const listener = vi.fn();
      store.subscribe(listener);
      store.apply([add("X", 9)]);
      store.apply([undo]);
      expect(listener).not.toHaveBeenCalled();
    });

    it("when an observer unsubscribes, then it is no longer notified", () => {
      const store = new GraphStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.apply([add("Product")]);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

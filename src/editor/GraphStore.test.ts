import { describe, expect, it, vi } from "vitest";
import { EMPTY_GRAPH, type Graph } from "../domain/Graph";
import type { Operation } from "../domain/Operation";
import { GraphStore } from "./GraphStore";

function add(text: string, parentId?: number): Operation {
  return parentId === undefined ? { type: "add_node", text } : { type: "add_node", text, parentId };
}

function rename(id: number, text: string): Operation {
  return { type: "set_text", id, text };
}

function focus(id: number): Operation {
  return { type: "set_focus", id };
}

const undo: Operation = { type: "undo" };

function idsOf(graph: Graph): number[] {
  return graph.nodes.map((node) => node.id);
}

// Utterances: [1], [2], [3], then one utterance with [4, 5]. Node 5 has focus.
function storeWithFiveNodes(): GraphStore {
  const store = new GraphStore();
  store.apply([add("Product")]);
  store.apply([add("Pricing", 1)]);
  store.apply([add("Monthly", 2)]);
  store.apply([add("Annual", 3), add("Audience", 1)]);
  return store;
}

describe("GraphStore", () => {
  describe("Map starts empty", () => {
    it("when created, then the map has no nodes and no focus", () => {
      // given
      const store = new GraphStore();

      // when
      const graph = store.getGraph();

      // then
      expect(graph).toEqual(EMPTY_GRAPH);
    });
  });

  describe("Operations from one utterance apply all or nothing", () => {
    it("when the operations are valid, then the map is replaced", () => {
      // given
      const store = new GraphStore();

      // when
      const result = store.apply([add("Product")]);

      // then
      expect(result.ok).toBe(true);
      expect(store.getGraph().nodes).toEqual([{ id: 1, text: "Product" }]);
    });

    it("when the operations are rejected, then the map is unchanged and the reason is returned", () => {
      // given
      const store = storeWithFiveNodes();
      const before = store.getGraph();

      // when
      const result = store.apply([add("Discount", 9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
      expect(store.getGraph()).toBe(before);
    });

    it("when an utterance was rejected, then undo still reverts the last applied one", () => {
      // given
      const store = storeWithFiveNodes();
      store.apply([add("Discount", 9)]);

      // when
      store.apply([undo]);

      // then
      expect(idsOf(store.getGraph())).toEqual([1, 2, 3]);
    });
  });

  describe("Undo reverts the last utterance", () => {
    it("when the last utterance added two nodes, then undo removes both and restores the focus", () => {
      // given
      const store = storeWithFiveNodes();

      // when
      store.apply([undo]);

      // then
      expect(idsOf(store.getGraph())).toEqual([1, 2, 3]);
      expect(store.getGraph().focusId).toBe(3);
    });

    it("when a node was undone, then the next node reuses its label", () => {
      // given
      const store = storeWithFiveNodes();
      store.apply([undo]);

      // when
      store.apply([add("Discount", 1)]);

      // then
      expect(store.getGraph().nodes.at(-1)?.id).toBe(4);
    });

    it("when undoing repeatedly, then each undo reverts the utterance before, back to the empty map", () => {
      // given
      const store = storeWithFiveNodes();

      // when
      for (let i = 0; i < 4; i++) store.apply([undo]);

      // then
      expect(store.getGraph()).toEqual(EMPTY_GRAPH);
    });

    it("when undo is followed by other operations, then they apply to the restored map, and a further undo removes them", () => {
      // given
      const store = storeWithFiveNodes();

      // when
      const result = store.apply([undo, add("Price", 2)]);

      // then
      expect(result.ok).toBe(true);
      expect(store.getGraph().nodes.slice(3)).toEqual([{ id: 4, text: "Price", parentId: 2 }]);

      // when
      store.apply([undo]);

      // then
      expect(idsOf(store.getGraph())).toEqual([1, 2, 3]);
    });

    it("when undo is not the first operation, then it is rejected and the map is unchanged", () => {
      // given
      const store = storeWithFiveNodes();
      const before = store.getGraph();

      // when
      const result = store.apply([add("Discount", 1), undo]);

      // then
      expect(result).toEqual({ ok: false, reason: "Undo must come first." });
      expect(store.getGraph()).toBe(before);
    });

    it("when undo comes twice in one utterance, then it is rejected", () => {
      // given
      const store = storeWithFiveNodes();

      // when
      const result = store.apply([undo, undo]);

      // then
      expect(result).toEqual({ ok: false, reason: "Undo must come first." });
    });

    it("when there is nothing to undo, then it is rejected and the map is unchanged", () => {
      // given
      const store = new GraphStore();

      // when
      const result = store.apply([undo]);

      // then
      expect(result).toEqual({ ok: false, reason: "There is nothing to undo." });
      expect(store.getGraph()).toEqual(EMPTY_GRAPH);
    });

    it("when there is nothing to undo before other operations, then it is rejected", () => {
      // given
      const store = new GraphStore();

      // when
      const result = store.apply([undo, add("Product")]);

      // then
      expect(result).toEqual({ ok: false, reason: "There is nothing to undo." });
      expect(store.getGraph()).toEqual(EMPTY_GRAPH);
    });

    it("when the operations after undo fail, then the undo is not applied either", () => {
      // given
      const store = storeWithFiveNodes();
      const before = store.getGraph();

      // when
      const result = store.apply([undo, add("Price", 9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
      expect(store.getGraph()).toBe(before);

      // when
      store.apply([undo]);

      // then
      expect(idsOf(store.getGraph())).toEqual([1, 2, 3]);
    });
  });

  describe("Every applied utterance is kept for undo", () => {
    it("when an utterance only moved the focus, then undo restores the previous focus", () => {
      // given
      const store = storeWithFiveNodes();
      store.apply([focus(3)]);

      // when
      store.apply([undo]);

      // then
      expect(store.getGraph().focusId).toBe(5);
    });

    it("when an utterance left the map as it was, then undo reverts that utterance and not the one before", () => {
      // given
      const store = storeWithFiveNodes();
      store.apply([rename(3, "Monthly")]);

      // when
      store.apply([undo]);

      // then
      expect(idsOf(store.getGraph())).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("Map changes are observable", () => {
    it("when an utterance is applied, then every observer receives the new map", () => {
      // given
      const store = new GraphStore();
      const first = vi.fn();
      const second = vi.fn();
      store.subscribe(first);
      store.subscribe(second);

      // when
      store.apply([add("Product")]);

      // then
      expect(first).toHaveBeenCalledExactlyOnceWith(store.getGraph());
      expect(second).toHaveBeenCalledExactlyOnceWith(store.getGraph());
    });

    it("when an utterance is undone, then observers receive the restored map", () => {
      // given
      const store = storeWithFiveNodes();
      const listener = vi.fn();
      store.subscribe(listener);

      // when
      store.apply([undo]);

      // then
      expect(listener).toHaveBeenCalledExactlyOnceWith(store.getGraph());
    });

    it("when undo is followed by other operations, then observers receive only the final map", () => {
      // given
      const store = storeWithFiveNodes();
      const listener = vi.fn();
      store.subscribe(listener);

      // when
      store.apply([undo, add("Price", 2)]);

      // then
      expect(listener).toHaveBeenCalledExactlyOnceWith(store.getGraph());
    });

    it("when a request is rejected, then observers are not notified", () => {
      // given
      const store = new GraphStore();
      const listener = vi.fn();
      store.subscribe(listener);

      // when
      store.apply([add("Discount", 9)]);
      store.apply([undo]);

      // then
      expect(listener).not.toHaveBeenCalled();
    });

    it("when an observer unsubscribes, then it is no longer notified", () => {
      // given
      const store = new GraphStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();

      // when
      store.apply([add("Product")]);

      // then
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

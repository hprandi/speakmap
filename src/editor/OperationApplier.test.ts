import { describe, expect, it } from "vitest";
import { EMPTY_GRAPH, type Graph } from "../domain/Graph";
import { OperationApplier, type ApplyResult, type EditOperation } from "./OperationApplier";

const applier = new OperationApplier();

function add(text: string, parentId?: number): EditOperation {
  return parentId === undefined ? { type: "add_node", text } : { type: "add_node", text, parentId };
}

function applied(result: ApplyResult): Graph {
  if (!result.ok) throw new Error(`expected success, got: ${result.reason}`);
  return result.graph;
}

const threeNodes: Graph = {
  nodes: [
    { id: 1, text: "Product" },
    { id: 2, text: "Pricing", parentId: 1 },
    { id: 3, text: "Monthly", parentId: 2 },
  ],
  focusId: 3,
  nextId: 4,
};

describe("OperationApplier", () => {
  describe("Nodes have permanent numbered labels", () => {
    it("when adding to an empty map, then ids are 1, 2 and 3 in creation order", () => {
      let graph = EMPTY_GRAPH;
      for (const text of ["A", "B", "C"]) graph = applied(applier.apply(graph, [add(text)]));
      expect(graph.nodes.map((node) => node.id)).toEqual([1, 2, 3]);
      expect(graph.nextId).toBe(4);
    });

    it("when adding, then the id comes from nextId", () => {
      const graph = applied(applier.apply({ ...threeNodes, nextId: 7 }, [add("D")]));
      expect(graph.nodes.at(-1)?.id).toBe(7);
      expect(graph.nextId).toBe(8);
    });
  });

  describe("Nodes form a tree with a single root", () => {
    it("when adding to an empty map, then the node is the root", () => {
      const graph = applied(applier.apply(EMPTY_GRAPH, [add("Product")]));
      expect(graph.nodes).toEqual([{ id: 1, text: "Product" }]);
    });

    it("when a root exists, then a new node is never a second root", () => {
      const graph = applied(applier.apply(threeNodes, [add("D")]));
      expect(graph.nodes.filter((node) => node.parentId === undefined)).toHaveLength(1);
      expect(graph.nodes.at(-1)?.parentId).toBeDefined();
    });

    it("when adding two nodes to an empty map, then the second goes under the root", () => {
      const graph = applied(applier.apply(EMPTY_GRAPH, [add("Product"), add("Pricing")]));
      expect(graph.nodes).toEqual([
        { id: 1, text: "Product" },
        { id: 2, text: "Pricing", parentId: 1 },
      ]);
    });
  });

  describe("Default parent is the focus", () => {
    it("when no parent is given, then the node goes under the focus", () => {
      const graph = applied(applier.apply({ ...threeNodes, focusId: 2 }, [add("Annual")]));
      expect(graph.nodes.at(-1)).toEqual({ id: 4, text: "Annual", parentId: 2 });
    });

    it("when adding two nodes without parent, then both go under the focus", () => {
      const graph = applied(applier.apply(threeNodes, [add("D"), add("E")]));
      expect(graph.nodes.slice(-2).map((node) => node.parentId)).toEqual([3, 3]);
    });
  });

  describe("Explicit parent label", () => {
    it("when a parent is given, then the node goes under it", () => {
      const graph = applied(applier.apply({ ...threeNodes, focusId: 2 }, [add("Audience", 1)]));
      expect(graph.nodes.at(-1)).toEqual({ id: 4, text: "Audience", parentId: 1 });
    });

    it("when the parent was created in the same utterance, then the node goes under it", () => {
      const graph = applied(applier.apply(threeNodes, [add("D"), add("E", 4)]));
      expect(graph.nodes.at(-1)).toEqual({ id: 5, text: "E", parentId: 4 });
    });
  });

  describe("Focus follows the last created node", () => {
    it("when adding a node, then it gets the focus", () => {
      const graph = applied(applier.apply(threeNodes, [add("D")]));
      expect(graph.focusId).toBe(4);
    });

    it("when adding several nodes, then the last one gets the focus", () => {
      const graph = applied(applier.apply(threeNodes, [add("D"), add("E")]));
      expect(graph.focusId).toBe(5);
    });
  });

  describe("Operations from one utterance apply all or nothing", () => {
    it("when the parent does not exist, then it is rejected", () => {
      const result = applier.apply(threeNodes, [add("D", 9)]);
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when a parent is given on an empty map, then it is rejected", () => {
      const result = applier.apply(EMPTY_GRAPH, [add("D", 1)]);
      expect(result).toEqual({ ok: false, reason: "Node 1 does not exist." });
    });

    it("when the text is empty, then it is rejected", () => {
      expect(applier.apply(threeNodes, [add("")])).toEqual({ ok: false, reason: "A node cannot have an empty text." });
    });

    it("when the text is blank, then it is rejected", () => {
      expect(applier.apply(threeNodes, [add("   ")]).ok).toBe(false);
    });

    it("when the text has surrounding spaces, then it is trimmed", () => {
      const graph = applied(applier.apply(threeNodes, [add("  Annual  ")]));
      expect(graph.nodes.at(-1)?.text).toBe("Annual");
    });

    it("when one operation is invalid, then all are rejected", () => {
      expect(applier.apply(threeNodes, [add("D"), add("E", 9)]).ok).toBe(false);
    });

    it("when there are no operations, then it is rejected", () => {
      expect(applier.apply(threeNodes, []).ok).toBe(false);
    });

    it("when all operations are valid, then all are applied", () => {
      const graph = applied(applier.apply(threeNodes, [add("D"), add("E", 1)]));
      expect(graph.nodes.slice(3)).toEqual([
        { id: 4, text: "D", parentId: 3 },
        { id: 5, text: "E", parentId: 1 },
      ]);
    });

    it("when applying or rejecting, then the input graph is unchanged", () => {
      const before = structuredClone(threeNodes);
      applier.apply(threeNodes, [add("D")]);
      applier.apply(threeNodes, [add("D"), add("E", 9)]);
      expect(threeNodes).toEqual(before);
    });
  });
});

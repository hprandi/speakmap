import { describe, expect, it } from "vitest";
import { EMPTY_GRAPH, type Graph } from "../domain/Graph";
import { OperationApplier, type ApplyResult, type EditOperation } from "./OperationApplier";

const applier = new OperationApplier();

function add(text: string, parentId?: number): EditOperation {
  return parentId === undefined ? { type: "add_node", text } : { type: "add_node", text, parentId };
}

function deleteNode(id: number): EditOperation {
  return { type: "delete_node", id };
}

function move(id: number, parentId?: number): EditOperation {
  return parentId === undefined ? { type: "set_parent", id } : { type: "set_parent", id, parentId };
}

function rename(id: number, text: string): EditOperation {
  return { type: "set_text", id, text };
}

function focus(id: number): EditOperation {
  return { type: "set_focus", id };
}

function applied(result: ApplyResult): Graph {
  if (!result.ok) throw new Error(`expected success, got: ${result.reason}`);
  return result.graph;
}

function idsOf(graph: Graph): number[] {
  return graph.nodes.map((node) => node.id);
}

function parentOf(graph: Graph, id: number): number | undefined {
  return graph.nodes.find((node) => node.id === id)?.parentId;
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

// 1 Product
// +-- 2 Pricing
// |   +-- 4 Monthly
// |   +-- 5 Annual
// |       +-- 6 Discount
// +-- 3 Audience
const sixNodes: Graph = {
  nodes: [
    { id: 1, text: "Product" },
    { id: 2, text: "Pricing", parentId: 1 },
    { id: 3, text: "Audience", parentId: 1 },
    { id: 4, text: "Monthly", parentId: 2 },
    { id: 5, text: "Annual", parentId: 2 },
    { id: 6, text: "Discount", parentId: 5 },
  ],
  focusId: 6,
  nextId: 7,
};

describe("OperationApplier", () => {
  describe("Add node operation", () => {
    it("when adding under a parent, then the node becomes its child", () => {
      // given
      const graph = { ...threeNodes, focusId: 2 };

      // when
      const result = applier.apply(graph, [add("Audience", 1)]);

      // then
      expect(applied(result).nodes.at(-1)).toEqual({ id: 4, text: "Audience", parentId: 1 });
    });

    it("when adding without a parent on an empty map, then the node is the root", () => {
      // given
      const graph = EMPTY_GRAPH;

      // when
      const result = applier.apply(graph, [add("Product")]);

      // then
      expect(applied(result).nodes).toEqual([{ id: 1, text: "Product" }]);
    });

    it("when adding a root and moving the old root under it, then the new node is the only root", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("Business"), move(1, 4)]);

      // then
      expect(parentOf(applied(result), 4)).toBeUndefined();
      expect(parentOf(applied(result), 1)).toBe(4);
    });

    it("when adding under a node created earlier in the utterance, then the node goes under it", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("Annual", 2), add("Discount", 4)]);

      // then
      expect(applied(result).nodes.at(-1)).toEqual({ id: 5, text: "Discount", parentId: 4 });
    });

    it("when the text has surrounding spaces, then it is trimmed", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("  Price  ", 1)]);

      // then
      expect(applied(result).nodes.at(-1)?.text).toBe("Price");
    });
  });

  describe("Delete node operation", () => {
    it("when deleting a leaf, then only that node is gone", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(4)]);

      // then
      expect(applied(result).nodes).toEqual(sixNodes.nodes.filter((node) => node.id !== 4));
    });

    it("when deleting a node with children, then its whole subtree is gone", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(2)]);

      // then
      expect(idsOf(applied(result))).toEqual([1, 3]);
    });

    it("when deleting the root, then the map is empty and has no focus", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(1)]);

      // then
      expect(applied(result).nodes).toEqual([]);
      expect(applied(result).focusId).toBeUndefined();
    });

    it("when the children are moved before the delete, then they are kept", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(4, 1), move(5, 1), deleteNode(2)]);

      // then
      expect(idsOf(applied(result))).toEqual([1, 3, 4, 5, 6]);
      expect(parentOf(applied(result), 4)).toBe(1);
      expect(parentOf(applied(result), 5)).toBe(1);
      expect(parentOf(applied(result), 6)).toBe(5);
    });
  });

  describe("Deleting an already removed node is not an error", () => {
    it("when deleting a parent and then its child, then the utterance is applied", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(2), deleteNode(4)]);

      // then
      expect(idsOf(applied(result))).toEqual([1, 3]);
    });
  });

  describe("Move node operation", () => {
    it("when moving under another node, then it changes parent and keeps its children", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(5, 3)]);

      // then
      expect(parentOf(applied(result), 5)).toBe(3);
      expect(parentOf(applied(result), 6)).toBe(5);
    });

    it("when moving a child to the root and the old root under it, then the root changes", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(2), move(1, 2)]);

      // then
      expect(parentOf(applied(result), 2)).toBeUndefined();
      expect(parentOf(applied(result), 1)).toBe(2);
    });
  });

  describe("Rename node operation", () => {
    it("when renaming a node, then only its text changes", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [rename(3, "Customers")]);

      // then
      expect(applied(result).nodes.find((node) => node.id === 3)).toEqual({ id: 3, text: "Customers", parentId: 1 });
    });

    it("when the new text has surrounding spaces, then it is trimmed", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [rename(3, "  Customers  ")]);

      // then
      expect(applied(result).nodes.find((node) => node.id === 3)?.text).toBe("Customers");
    });
  });

  describe("Set focus operation", () => {
    it("when setting the focus, then only the focus changes", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [focus(3)]);

      // then
      expect(applied(result)).toEqual({ ...sixNodes, focusId: 3 });
    });
  });

  describe("Operations apply in order", () => {
    it("when renaming a node created earlier in the utterance, then the rename applies to it", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [add("Price", 1), rename(7, "Pricing plans")]);

      // then
      expect(applied(result).nodes.at(-1)).toEqual({ id: 7, text: "Pricing plans", parentId: 1 });
    });

    it("when deleting a node that does not exist, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when moving a node that does not exist, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(9, 1)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when renaming a node that does not exist, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [rename(9, "Customers")]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when focusing a node that does not exist, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [focus(9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when renaming a node removed earlier in the utterance, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(2), rename(4, "Monthly plan")]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 4 does not exist." });
    });
  });

  describe("Integrity rules are checked at the end of the utterance", () => {
    it("when a node is added under one created later in the utterance, then it is applied", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("Discount", 5), add("Annual", 2)]);

      // then
      expect(applied(result).nodes.slice(3)).toEqual([
        { id: 4, text: "Discount", parentId: 5 },
        { id: 5, text: "Annual", parentId: 2 },
      ]);
    });

    it("when a state in the middle has a cycle but the end does not, then it is applied", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(1, 2), move(2)]);

      // then
      expect(parentOf(applied(result), 2)).toBeUndefined();
      expect(parentOf(applied(result), 1)).toBe(2);
    });

    it("when the map ends with two roots, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(3)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Nodes 1 and 3 are both roots." });
    });

    it("when a node is moved under its own descendant, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(2, 6)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 2 cannot be under its own descendant." });
    });

    it("when a node is moved under itself, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(5, 5)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 5 cannot be under its own descendant." });
    });

    it("when a node is renamed to an empty text, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [rename(3, "  ")]);

      // then
      expect(result).toEqual({ ok: false, reason: "A node cannot have an empty text." });
    });

    it("when the focus is set to a node deleted later in the utterance, then it is rejected", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [focus(4), deleteNode(4)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 4 does not exist." });
    });
  });

  describe("Only the first broken integrity rule is reported", () => {
    it("when the map ends with a cycle and no root, then the cycle is reported", () => {
      // given
      const graph: Graph = {
        nodes: [
          { id: 2, text: "Pricing" },
          { id: 5, text: "Annual", parentId: 2 },
        ],
        focusId: 5,
        nextId: 6,
      };

      // when
      const result = applier.apply(graph, [move(2, 5)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 2 cannot be under its own descendant." });
    });

    it("when a node has an empty text and a missing parent, then the empty text is reported", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("", 9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "A node cannot have an empty text." });
    });
  });

  describe("Nodes form a tree with a single root", () => {
    it("when adding to an empty map, then the first node has no parent", () => {
      // given
      const graph = EMPTY_GRAPH;

      // when
      const result = applier.apply(graph, [add("Product"), add("Pricing", 1)]);

      // then
      expect(applied(result).nodes).toEqual([
        { id: 1, text: "Product" },
        { id: 2, text: "Pricing", parentId: 1 },
      ]);
    });

    it("when adding without a parent to a map with a root, then it is rejected as a second root", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("Audience")]);

      // then
      expect(result).toEqual({ ok: false, reason: "Nodes 1 and 4 are both roots." });
    });

    it("when adding two nodes without a parent to an empty map, then it is rejected as two roots", () => {
      // given
      const graph = EMPTY_GRAPH;

      // when
      const result = applier.apply(graph, [add("Product"), add("Pricing")]);

      // then
      expect(result).toEqual({ ok: false, reason: "Nodes 1 and 2 are both roots." });
    });
  });

  describe("Nodes have permanent numbered labels", () => {
    it("when adding to an empty map, then labels follow creation order", () => {
      // given
      const graph = EMPTY_GRAPH;

      // when
      const result = applier.apply(graph, [add("A"), add("B", 1), add("C", 1)]);

      // then
      expect(idsOf(applied(result))).toEqual([1, 2, 3]);
      expect(applied(result).nextId).toBe(4);
    });

    it("when adding, then the label comes from the next label", () => {
      // given
      const graph = { ...threeNodes, nextId: 7 };

      // when
      const result = applier.apply(graph, [add("D", 1)]);

      // then
      expect(applied(result).nodes.at(-1)?.id).toBe(7);
      expect(applied(result).nextId).toBe(8);
    });

    it("when a node is deleted, then the other nodes keep their labels", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(4)]);

      // then
      expect(idsOf(applied(result))).toEqual([1, 2, 3, 5, 6]);
    });

    it("when a node is added after a delete, then it does not reuse the deleted label", () => {
      // given
      const graph = applied(applier.apply(sixNodes, [deleteNode(6)]));

      // when
      const result = applier.apply(graph, [add("Coupon", 5)]);

      // then
      expect(applied(result).nodes.at(-1)?.id).toBe(7);
    });

    it("when a node is created and deleted in one utterance, then its label is used up", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [add("Coupon", 5), deleteNode(7)]);

      // then
      expect(idsOf(applied(result))).toEqual([1, 2, 3, 4, 5, 6]);
      expect(applied(result).nextId).toBe(8);
    });
  });

  describe("Operations from one utterance apply all or nothing", () => {
    it("when the parent does not exist, then it is rejected", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("D", 9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when a parent is given on an empty map, then it is rejected", () => {
      // given
      const graph = EMPTY_GRAPH;

      // when
      const result = applier.apply(graph, [add("D", 1)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 1 does not exist." });
    });

    it("when the text is empty, then it is rejected", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("", 1)]);

      // then
      expect(result).toEqual({ ok: false, reason: "A node cannot have an empty text." });
    });

    it("when the text is blank, then it is rejected", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("   ", 1)]);

      // then
      expect(result).toEqual({ ok: false, reason: "A node cannot have an empty text." });
    });

    it("when one operation is invalid, then none is applied", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("D", 1), deleteNode(9)]);

      // then
      expect(result).toEqual({ ok: false, reason: "Node 9 does not exist." });
    });

    it("when every operation is valid, then all are applied together", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("D", 3), add("E", 1)]);

      // then
      expect(applied(result).nodes.slice(3)).toEqual([
        { id: 4, text: "D", parentId: 3 },
        { id: 5, text: "E", parentId: 1 },
      ]);
    });

    it("when there are no operations, then it is rejected", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, []);

      // then
      expect(result).toEqual({ ok: false, reason: "There are no operations to apply." });
    });

    it("when applying or rejecting, then the input map is unchanged", () => {
      // given
      const before = structuredClone(sixNodes);

      // when
      applier.apply(sixNodes, [deleteNode(2), move(3), rename(1, "Business")]);
      applier.apply(sixNodes, [move(5, 3), deleteNode(9)]);

      // then
      expect(sixNodes).toEqual(before);
    });
  });

  describe("Focus after an utterance", () => {
    it("when adding a node, then it gets the focus", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("D", 1)]);

      // then
      expect(applied(result).focusId).toBe(4);
    });

    it("when adding several nodes, then the last one gets the focus", () => {
      // given
      const graph = threeNodes;

      // when
      const result = applier.apply(graph, [add("D", 1), add("E", 1)]);

      // then
      expect(applied(result).focusId).toBe(5);
    });

    it("when the focus is set after adding, then the set focus wins", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [add("Segments", 3), focus(3)]);

      // then
      expect(applied(result).focusId).toBe(3);
    });

    it("when the created node is deleted in the same utterance, then the previous focus stays", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [add("Coupon", 5), deleteNode(7)]);

      // then
      expect(applied(result).focusId).toBe(6);
    });

    it("when renaming another node, then the focus stays", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [rename(3, "Customers")]);

      // then
      expect(applied(result).focusId).toBe(6);
    });

    it("when the focused node is deleted with its parent, then the nearest surviving ancestor gets the focus", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [deleteNode(5)]);

      // then
      expect(applied(result).focusId).toBe(2);
    });

    it("when no ancestor of the focused node survives, then the root gets the focus", () => {
      // given
      const graph = sixNodes;

      // when
      const result = applier.apply(graph, [move(3), deleteNode(1)]);

      // then
      expect(idsOf(applied(result))).toEqual([3]);
      expect(applied(result).focusId).toBe(3);
    });
  });
});

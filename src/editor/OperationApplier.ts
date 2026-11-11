import type { Graph, GraphNode } from "../domain/Graph";
import type { AddNodeOperation, Operation, UndoOperation } from "../domain/Operation";

export type EditOperation = Exclude<Operation, UndoOperation>;

export type ApplyResult =
  | { readonly ok: true; readonly graph: Graph }
  | { readonly ok: false; readonly reason: string };

export class OperationApplier {
  apply(graph: Graph, operations: readonly EditOperation[]): ApplyResult {
    if (operations.length === 0) {
      return this.reject("There are no operations to apply.");
    }

    // Nodes without a parent go under the focus from before the utterance, so they become siblings.
    const defaultParentId = graph.focusId;
    let current = graph;

    for (const operation of operations) {
      const result = this.addNode(current, operation, defaultParentId);
      if (!result.ok) return result;
      current = result.graph;
    }

    return {
      ok: true,
      graph: {
        ...current,
        focusId: current.nextId - 1
      }
    };
  }

  private addNode(graph: Graph, operation: AddNodeOperation, defaultParentId?: number): ApplyResult {
    const text = operation.text.trim();
    if (text === "") {
      return this.reject("A node cannot have an empty text.");
    }

    const parentId = this.resolveParentId(graph, operation, defaultParentId);
    if (parentId !== undefined && !this.hasNode(graph, parentId)) {
      return this.reject(`Node ${parentId} does not exist.`);
    }

    const node: GraphNode = parentId === undefined ? { id: graph.nextId, text } : { id: graph.nextId, text, parentId };
    return {
      ok: true,
      graph: {
        ...graph,
        nodes: [...graph.nodes, node],
        nextId: graph.nextId + 1
      }
    };
  }

  /** Explicit parent, else the default parent, else the root. Undefined only on an empty map: the node becomes the root. */
  private resolveParentId(graph: Graph, operation: AddNodeOperation, defaultParentId?: number): number | undefined {
    return operation.parentId ?? defaultParentId ?? graph.nodes[0]?.id;
  }

  private hasNode(graph: Graph, id: number): boolean {
    return graph.nodes.some((node) => node.id === id);
  }

  private reject(reason: string): ApplyResult {
    return { ok: false, reason };
  }
}

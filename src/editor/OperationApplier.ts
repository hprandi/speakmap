import type { Graph, GraphNode } from "../domain/Graph";
import type {
  AddNodeOperation,
  DeleteNodeOperation,
  Operation,
  SetFocusOperation,
  SetParentOperation,
  SetTextOperation,
  UndoOperation,
} from "../domain/Operation";
import { IntegrityRules } from "./IntegrityRules";

export type EditOperation = Exclude<Operation, UndoOperation>;

export type ApplyResult =
  | { readonly ok: true; readonly graph: Graph }
  | { readonly ok: false; readonly reason: string };

type Draft = {
  nodes: GraphNode[];
  nextId: number;
  createdIds: number[];
  focusTargetId?: number;
};

export class OperationApplier {
  private readonly integrityRules = new IntegrityRules();

  apply(graph: Graph, operations: readonly EditOperation[]): ApplyResult {
    if (operations.length === 0) {
      return this.reject("There are no operations to apply.");
    }

    const draft: Draft = { nodes: [...graph.nodes], nextId: graph.nextId, createdIds: [] };
    for (const operation of operations) {
      const failure = this.applyOperation(draft, operation);
      if (failure !== undefined) return this.reject(failure);
    }

    const result = this.convertDraftToGraph(draft, this.resolveFocus(graph, draft));
    const violation = this.integrityRules.validate(result);
    if (violation !== undefined) return this.reject(violation);
    return { ok: true, graph: result };
  }

  private applyOperation(draft: Draft, operation: EditOperation): string | undefined {
    switch (operation.type) {
      case "add_node":
        return this.addNode(draft, operation);
      case "delete_node":
        return this.deleteNode(draft, operation);
      case "set_parent":
        return this.setParent(draft, operation);
      case "set_text":
        return this.setText(draft, operation);
      case "set_focus":
        return this.setFocus(draft, operation);
    }
  }

  private addNode(draft: Draft, operation: AddNodeOperation): string | undefined {
    if (operation.parentId === draft.nextId) return missingNode(operation.parentId);
    draft.nodes.push({ id: draft.nextId, text: operation.text.trim(), parentId: operation.parentId });
    draft.createdIds.push(draft.nextId);
    draft.nextId += 1;
    return undefined;
  }

  private deleteNode(draft: Draft, operation: DeleteNodeOperation): string | undefined {
    if (!hasNode(draft.nodes, operation.id)) return missingNode(operation.id);
    this.deleteSubtree(draft, operation.id);
    return undefined;
  }

  private setParent(draft: Draft, operation: SetParentOperation): string | undefined {
    return this.replaceNode(draft, operation.id, (node) => ({ ...node, parentId: operation.parentId }));
  }

  private setText(draft: Draft, operation: SetTextOperation): string | undefined {
    return this.replaceNode(draft, operation.id, (node) => ({ ...node, text: operation.text.trim() }));
  }

  private setFocus(draft: Draft, operation: SetFocusOperation): string | undefined {
    if (!hasNode(draft.nodes, operation.id)) return missingNode(operation.id);
    draft.focusTargetId = operation.id;
    return undefined;
  }

  private deleteSubtree(draft: Draft, rootId: number): void {
    const deletedIds = new Set([rootId]);
    let found = true;
    while (found) {
      found = false;
      for (const node of draft.nodes) {
        if (node.parentId !== undefined && deletedIds.has(node.parentId) && !deletedIds.has(node.id)) {
          deletedIds.add(node.id);
          found = true;
        }
      }
    }
    draft.nodes = draft.nodes.filter((node) => !deletedIds.has(node.id));
  }

  private replaceNode(draft: Draft, id: number, change: (node: GraphNode) => GraphNode): string | undefined {
    if (!hasNode(draft.nodes, id)) return missingNode(id);
    draft.nodes = draft.nodes.map((node) => (node.id === id ? change(node) : node));
    return undefined;
  }

  private resolveFocus(graph: Graph, draft: Draft): number | undefined {
    if (draft.focusTargetId !== undefined) return draft.focusTargetId;

    const lastCreatedId = draft.createdIds.findLast((id) => hasNode(draft.nodes, id));
    if (lastCreatedId !== undefined) return lastCreatedId;

    return this.previousFocusOrItsNearestSurvivingAncestor(graph, draft) ?? draft.nodes.find((node) => node.parentId === undefined)?.id;
  }

  private previousFocusOrItsNearestSurvivingAncestor(graph: Graph, draft: Draft): number | undefined {
    let candidateId = graph.focusId;
    while (candidateId !== undefined && !hasNode(draft.nodes, candidateId)) {
      candidateId = graph.nodes.find((node) => node.id === candidateId)?.parentId;
    }
    return candidateId;
  }

  private convertDraftToGraph(draft: Draft, focusId: number | undefined): Graph {
    return { nodes: draft.nodes, nextId: draft.nextId, focusId };
  }

  private reject(reason: string): ApplyResult {
    return { ok: false, reason };
  }
}

function missingNode(id: number): string {
  return `Node ${id} does not exist.`;
}

function hasNode(nodes: readonly GraphNode[], id: number): boolean {
  return nodes.some((node) => node.id === id);
}

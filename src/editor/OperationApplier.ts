import type { Graph, GraphNode } from "../domain/Graph";
import type { Operation, UndoOperation } from "../domain/Operation";
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
      const failure = this.applyOperation(graph, draft, operation);
      if (failure !== undefined) return this.reject(failure);
    }

    const result = this.convertDraftToGraph(draft, this.resolveFocus(graph, draft));
    const violation = this.integrityRules.validate(result);
    if (violation !== undefined) return this.reject(violation);
    return { ok: true, graph: result };
  }

  private applyOperation(graph: Graph, draft: Draft, operation: EditOperation): string | undefined {
    if (operation.type === "add_node") { // AI: não daria para esse `add node` fazer parte do `switch` e toda essa adição aqui ficar isolada em um método, para seguir o padrão dos outros de código e ficar linear?
      if (operation.parentId === draft.nextId) return `Node ${operation.parentId} does not exist.`;
      draft.nodes.push(createNode(draft.nextId, operation.text.trim(), operation.parentId));
      draft.createdIds.push(draft.nextId);
      draft.nextId += 1;
      return undefined;
    }

    const target = draft.nodes.find((node) => node.id === operation.id);
    if (target === undefined) {
      const alreadyDeleted = operation.type === "delete_node" && hasNode(graph.nodes, operation.id); // AI: essa regra que a gente adicionou, de que um nodo deletado não dispara outro erro, super complica o código sem necessidade. Eu acho que a gente deveria remover ela e remover da spec também.
      return alreadyDeleted ? undefined : `Node ${operation.id} does not exist.`;
    }

    switch (operation.type) {
      case "delete_node":
        this.deleteSubtree(draft, target.id);
        break;
      case "set_parent":
        this.replaceNode(draft, createNode(target.id, target.text, operation.parentId));
        break;
      case "set_text":
        this.replaceNode(draft, createNode(target.id, operation.text.trim(), target.parentId));
        break;
      case "set_focus":
        draft.focusTargetId = target.id;
        break;
    }
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

  private replaceNode(draft: Draft, replacement: GraphNode): void {
    draft.nodes = draft.nodes.map((node) => (node.id === replacement.id ? replacement : node));
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
    const graph = { nodes: draft.nodes, nextId: draft.nextId };
    return focusId === undefined ? graph : { ...graph, focusId }; // AI: Can't this be { ..graph, focusId }  only, in a way that we pass focusId=null?
  }

  private reject(reason: string): ApplyResult {
    return { ok: false, reason };
  }
}

function createNode(id: number, text: string, parentId: number | undefined): GraphNode {
  return parentId === undefined ? { id, text } : { id, text, parentId };
}

function hasNode(nodes: readonly GraphNode[], id: number): boolean {
  return nodes.some((node) => node.id === id);
}

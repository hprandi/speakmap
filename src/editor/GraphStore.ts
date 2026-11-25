import { EMPTY_GRAPH, type Graph } from "../domain/Graph";
import type { Operation } from "../domain/Operation";
import { OperationApplier, type ApplyResult, type EditOperation } from "./OperationApplier";

export type GraphListener = (graph: Graph) => void;

export class GraphStore {
  private graph: Graph = EMPTY_GRAPH;
  private history: Graph[] = [];
  private readonly listeners = new Set<GraphListener>();
  private readonly applier: OperationApplier;

  constructor(applier: OperationApplier = new OperationApplier()) {
    this.applier = applier;
  }

  getGraph(): Graph {
    return this.graph;
  }

  subscribe(listener: GraphListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  apply(operations: readonly Operation[]): ApplyResult {
    const startsWithUndo = operations[0]?.type === "undo";
    const rest = startsWithUndo ? operations.slice(1) : operations;
    if (!rest.every(isEdit)) return this.reject("Undo must come first.");

    return startsWithUndo ? this.undoThenApply(rest) : this.applyEdits(rest);
  }

  private applyEdits(edits: readonly EditOperation[]): ApplyResult {
    const result = this.applier.apply(this.graph, edits);
    if (!result.ok) return result;

    this.history.push(this.graph);
    this.setCurrentGraph(result.graph);
    return result;
  }

  private undoThenApply(edits: readonly EditOperation[]): ApplyResult {
    const restored = this.history.at(-1);
    if (restored === undefined) return this.reject("There is nothing to undo.");

    if (edits.length === 0) {
      this.history.pop();
      this.setCurrentGraph(restored);
      return { ok: true, graph: restored };
    }

    const result = this.applier.apply(restored, edits);
    if (!result.ok) return result;

    this.setCurrentGraph(result.graph);
    return result;
  }

  private setCurrentGraph(graph: Graph): void {
    this.graph = graph;
    for (const listener of this.listeners) listener(graph);
  }

  private reject(reason: string): ApplyResult {
    return { ok: false, reason };
  }
}

function isEdit(operation: Operation): operation is EditOperation {
  return operation.type !== "undo";
}

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
    const edits = operations.filter((operation): operation is EditOperation => operation.type !== "undo");
    const undoCount = operations.length - edits.length;

    if (undoCount === 0) return this.applyEdits(edits);
    if (operations.length === 1) return this.undo();
    return this.reject("Undo cannot be combined with other operations.");
  }

  private applyEdits(edits: readonly EditOperation[]): ApplyResult {
    const result = this.applier.apply(this.graph, edits);
    if (!result.ok) return result;

    this.history.push(this.graph);
    this.setCurrentGraph(result.graph);
    return result;
  }

  private undo(): ApplyResult {
    const previous = this.history.pop();
    if (previous === undefined) return this.reject("There is nothing to undo.");

    this.setCurrentGraph(previous);
    return { ok: true, graph: previous };
  }

  private setCurrentGraph(graph: Graph): void {
    this.graph = graph;
    for (const listener of this.listeners) listener(graph);
  }

  private reject(reason: string): ApplyResult {
    return { ok: false, reason };
  }
}

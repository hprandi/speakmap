export type GraphNode = {
  readonly id: number;
  readonly text: string;
  readonly parentId?: number;
};

export type Graph = {
  readonly nodes: readonly GraphNode[];
  readonly focusId?: number;
  readonly nextId: number;
};

export const EMPTY_GRAPH: Graph = { nodes: [], nextId: 1 };

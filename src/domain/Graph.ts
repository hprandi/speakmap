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

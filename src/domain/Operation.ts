export type AddNodeOperation = {
  readonly type: "add_node";
  readonly text: string;
  readonly parentId?: number;
};

export type UndoOperation = {
  readonly type: "undo";
};

export type Operation = AddNodeOperation | UndoOperation;

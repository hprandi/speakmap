export type AddNodeOperation = {
  readonly type: "add_node";
  readonly text: string;
  readonly parentId?: number;
};

export type DeleteNodeOperation = {
  readonly type: "delete_node";
  readonly id: number;
};

export type SetParentOperation = {
  readonly type: "set_parent";
  readonly id: number;
  readonly parentId?: number;
};

export type SetTextOperation = {
  readonly type: "set_text";
  readonly id: number;
  readonly text: string;
};

export type SetFocusOperation = {
  readonly type: "set_focus";
  readonly id: number;
};

export type UndoOperation = {
  readonly type: "undo";
};

export type Operation =
  | AddNodeOperation
  | DeleteNodeOperation
  | SetParentOperation
  | SetTextOperation
  | SetFocusOperation
  | UndoOperation;

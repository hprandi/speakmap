import { z } from "zod";

z.config({ jitless: true });

const AddNodeSchema = z.object({
  type: z.enum(["add_node"]),
  text: z.string(),
  parentId: z.number().int().nullable(),
});
const DeleteNodeSchema = z.object({ type: z.enum(["delete_node"]), id: z.number().int() });
const SetParentSchema = z.object({
  type: z.enum(["set_parent"]),
  id: z.number().int(),
  parentId: z.number().int().nullable(),
});
const SetTextSchema = z.object({ type: z.enum(["set_text"]), id: z.number().int(), text: z.string() });
const SetFocusSchema = z.object({ type: z.enum(["set_focus"]), id: z.number().int() });
const UndoSchema = z.object({ type: z.enum(["undo"]) });

const OperationSchema = z.discriminatedUnion("type", [
  AddNodeSchema,
  DeleteNodeSchema,
  SetParentSchema,
  SetTextSchema,
  SetFocusSchema,
  UndoSchema,
]);

export const OutputSchema = z.object({
  result: z.union([
    z.object({ operations: z.array(OperationSchema) }),
    z.object({ error: z.object({ message: z.string() }) }),
  ]),
});

export type Output = z.infer<typeof OutputSchema>;
export type OutputOperation = z.infer<typeof OperationSchema>;

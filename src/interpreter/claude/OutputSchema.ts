import { z } from "zod";

const AddNodeSchema = z.object({
  type: z.enum(["add_node"]),
  text: z.string(),
  parentId: z.number().int().nullable(),
});
const UndoSchema = z.object({ type: z.enum(["undo"]) });

export const OutputSchema = z.object({
  result: z.union([
    z.object({ operations: z.array(z.discriminatedUnion("type", [AddNodeSchema, UndoSchema])) }),
    z.object({ error: z.object({ message: z.string() }) }),
  ]),
});

export type Output = z.infer<typeof OutputSchema>;
export type OutputOperation = z.infer<typeof AddNodeSchema> | z.infer<typeof UndoSchema>;

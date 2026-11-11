import type { Graph } from "./Graph";
import type { Operation } from "./Operation";
import type { SpeechLanguage } from "./SpeechLanguage";

export type InterpretationResult =
  | { readonly operations: readonly Operation[] }
  | { readonly error: { readonly message: string } };

export interface Interpreter {
  interpret(
    transcript: string,
    graph: Graph,
    language: SpeechLanguage,
    signal: AbortSignal,
  ): Promise<InterpretationResult>;
}

export type InterpretationErrorReason = "malformed-response";

export class InterpretationError extends Error {
  readonly reason: InterpretationErrorReason;

  constructor(reason: InterpretationErrorReason, message: string = reason) {
    super(message);
    this.name = "InterpretationError";
    this.reason = reason;
  }
}

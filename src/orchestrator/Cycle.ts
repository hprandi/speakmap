import type { Graph } from "../domain/Graph";
import type { InterpretationResult } from "../domain/Interpreter";
import type { SpeechLanguage } from "../domain/SpeechLanguage";

export type Cycle = {
  readonly abortController: AbortController;
  readonly language: SpeechLanguage;
  readonly graphBefore: Graph;
  transcript?: string;
  interpretation?: InterpretationResult;
};

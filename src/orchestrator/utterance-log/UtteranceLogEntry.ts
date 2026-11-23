import type { Graph } from "../../domain/Graph";
import type { InterpretationResult } from "../../domain/Interpreter";
import type { SpeechLanguage } from "../../domain/SpeechLanguage";

export type UtteranceOutcome =
  | "applied"
  | "rejected"
  | "interpretation-error"
  | "transcription-error"
  | "cancelled"
  | "empty";

export type ErrorKind = "transcription" | "interpretation" | "other";

export type UtteranceLogEntry = {
  readonly id: string;
  readonly time: string; // ISO 8601, when the cycle ended
  readonly language: SpeechLanguage;
  readonly transcript?: string;
  readonly interpretation?: InterpretationResult;
  readonly outcome: UtteranceOutcome;
  readonly reason?: string;
  readonly graphBefore: Graph;
  readonly graphAfter: Graph;
  readonly flaggedErrors: readonly ErrorKind[];
  readonly errorNote: string;
};

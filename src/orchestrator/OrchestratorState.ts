export type CycleStatus = "idle" | "listening" | "transcribing" | "interpreting";

export type OrchestratorState = {
  readonly status: CycleStatus;
  readonly transcript?: string;
  readonly errorMessage?: string;
};

export type OrchestratorListener = (state: OrchestratorState) => void;

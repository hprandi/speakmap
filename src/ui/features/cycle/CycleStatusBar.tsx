import type { CycleStatus, Orchestrator } from "../../../orchestrator/Orchestrator";
import { useOrchestratorState } from "./UseOrchestratorState";

const STATUS_TEXT: Record<CycleStatus, string> = {
  idle: "Ready",
  listening: "Listening…",
  transcribing: "Transcribing…",
  interpreting: "Thinking…",
};

type CycleStatusBarProps = {
  readonly orchestrator: Orchestrator;
};

export function CycleStatusBar({ orchestrator }: CycleStatusBarProps) {
  const state = useOrchestratorState(orchestrator);
  const busy = state.status !== "idle";

  return (
    <section className="cycle-status" aria-live="polite">
      <p className="status" data-status={state.status}>
        {state.status === "listening" && <span className="listening-indicator" aria-hidden="true">● </span>}
        {STATUS_TEXT[state.status]}
        {busy && (
          <button type="button" onClick={() => orchestrator.cancel()}>
            Cancel
          </button>
        )}
      </p>
      {state.transcript !== undefined && <p className="transcript">“{state.transcript}”</p>}
      {state.errorMessage !== undefined && (
        <p className="error" role="alert">
          {state.errorMessage}
        </p>
      )}
    </section>
  );
}

import { useSyncExternalStore } from "react";
import type { Orchestrator, OrchestratorState } from "../../../orchestrator/Orchestrator";

export function useOrchestratorState(orchestrator: Orchestrator): OrchestratorState {
  return useSyncExternalStore(
    (onChange) => orchestrator.subscribe(onChange),
    () => orchestrator.getState(),
  );
}

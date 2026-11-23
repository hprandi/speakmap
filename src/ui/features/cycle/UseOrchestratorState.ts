import { useSyncExternalStore } from "react";
import type { Orchestrator } from "../../../orchestrator/Orchestrator";
import type { OrchestratorState } from "../../../orchestrator/OrchestratorState";

export function useOrchestratorState(orchestrator: Orchestrator): OrchestratorState {
  return useSyncExternalStore(
    (onChange) => orchestrator.subscribe(onChange),
    () => orchestrator.getState(),
  );
}

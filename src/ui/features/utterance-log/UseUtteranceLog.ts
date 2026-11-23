import { useSyncExternalStore } from "react";
import type { UtteranceLog } from "../../../orchestrator/utterance-log/UtteranceLog";
import type { UtteranceLogEntry } from "../../../orchestrator/utterance-log/UtteranceLogEntry";

export function useUtteranceLog(utteranceLog: UtteranceLog): readonly UtteranceLogEntry[] {
  return useSyncExternalStore(
    (onChange) => utteranceLog.subscribe(onChange),
    () => utteranceLog.getEntries(),
  );
}

import { useState } from "react";
import type { InterpretationResult } from "../../../domain/Interpreter";
import type { ErrorKind, UtteranceLogEntry } from "../../../orchestrator/utterance-log/UtteranceLogEntry";
import { FlagErrorDialog } from "./FlagErrorDialog";

type UtteranceLogEntryBlockProps = {
  readonly entry: UtteranceLogEntry;
  readonly onFlagErrors: (flaggedErrors: readonly ErrorKind[], errorNote: string) => void;
};

export function UtteranceLogEntryBlock({ entry, onFlagErrors }: UtteranceLogEntryBlockProps) {
  const [flagging, setFlagging] = useState(false);
  const hasFlaggedErrors = entry.flaggedErrors.length > 0 || entry.errorNote !== "";

  return (
    <article className="utterance-log-entry" data-outcome={entry.outcome}>
      <header className="utterance-log-entry-header">
        <h3>{entry.id}</h3>
        <button type="button" onClick={() => setFlagging(true)}>
          flag error
        </button>
      </header>
      {entry.transcript !== undefined && <p>transcript: {entry.transcript}</p>}
      {entry.interpretation !== undefined && (
        <div>
          interpretation:
          <pre>{interpretationText(entry.interpretation)}</pre>
        </div>
      )}
      <p>result: {entry.reason === undefined ? entry.outcome : `${entry.outcome}, ${entry.reason}`}</p>
      {hasFlaggedErrors && (
        <p className="utterance-log-flagged">
          flagged: {entry.flaggedErrors.join(", ")}
          {entry.errorNote !== "" && <> (note: {entry.errorNote})</>}
        </p>
      )}
      {flagging && <FlagErrorDialog entry={entry} onConfirm={onFlagErrors} onClose={() => setFlagging(false)} />}
    </article>
  );
}

function interpretationText(interpretation: InterpretationResult): string {
  if ("error" in interpretation) return interpretation.error.message;
  return JSON.stringify(interpretation.operations, null, 2);
}

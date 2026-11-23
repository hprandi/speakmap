import type { InterpretationResult } from "../../../domain/Interpreter";
import type { UtteranceLogEntry } from "../../../orchestrator/utterance-log/UtteranceLogEntry";

type UtteranceLogEntryBlockProps = {
  readonly entry: UtteranceLogEntry;
};

export function UtteranceLogEntryBlock({ entry }: UtteranceLogEntryBlockProps) {
  const hasFlaggedErrors = entry.flaggedErrors.length > 0 || entry.errorNote !== "";

  return (
    <article className="utterance-log-entry" data-outcome={entry.outcome}>
      <h3>{entry.id}</h3>
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
    </article>
  );
}

function interpretationText(interpretation: InterpretationResult): string {
  if ("error" in interpretation) return interpretation.error.message;
  return JSON.stringify(interpretation.operations, null, 2);
}

import type { ErrorKind, UtteranceLogEntry } from "../../../orchestrator/utterance-log/UtteranceLogEntry";
import { useFollowBottom } from "./UseFollowBottom";
import { UtteranceLogEntryBlock } from "./UtteranceLogEntryBlock";

type UtteranceLogEntryListProps = {
  readonly entries: readonly UtteranceLogEntry[];
  readonly onFlagErrors: (id: string, flaggedErrors: readonly ErrorKind[], errorNote: string) => void;
};

export function UtteranceLogEntryList({ entries, onFlagErrors }: UtteranceLogEntryListProps) {
  const { ref, onScroll } = useFollowBottom<HTMLOListElement>(entries);

  return (
    <ol className="utterance-log-entries" ref={ref} onScroll={onScroll}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <UtteranceLogEntryBlock
            entry={entry}
            onFlagErrors={(flaggedErrors, errorNote) => onFlagErrors(entry.id, flaggedErrors, errorNote)}
          />
        </li>
      ))}
    </ol>
  );
}

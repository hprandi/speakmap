import type { UtteranceLogEntry } from "../../../orchestrator/utterance-log/UtteranceLogEntry";
import { useFollowBottom } from "./UseFollowBottom";
import { UtteranceLogEntryBlock } from "./UtteranceLogEntryBlock";

type UtteranceLogEntryListProps = {
  readonly entries: readonly UtteranceLogEntry[];
};

export function UtteranceLogEntryList({ entries }: UtteranceLogEntryListProps) {
  const { ref, onScroll } = useFollowBottom<HTMLOListElement>(entries);

  return (
    <ol className="utterance-log-entries" ref={ref} onScroll={onScroll}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <UtteranceLogEntryBlock entry={entry} />
        </li>
      ))}
    </ol>
  );
}

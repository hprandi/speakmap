import { useState } from "react";
import type { UtteranceLog } from "../../../orchestrator/utterance-log/UtteranceLog";
import { useUtteranceLog } from "./UseUtteranceLog";
import { UtteranceLogEntryBlock } from "./UtteranceLogEntryBlock";
import "./UtteranceLogPanel.css";

type UtteranceLogPanelProps = {
  readonly utteranceLog: UtteranceLog;
};

export function UtteranceLogPanel({ utteranceLog }: UtteranceLogPanelProps) {
  const [open, setOpen] = useState(false);
  const entries = useUtteranceLog(utteranceLog);

  return (
    <>
      <button
        type="button"
        className="utterance-log-toggle"
        aria-label={open ? "Close utterance log" : "Open utterance log"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ≡
      </button>
      {open && (
        <aside className="utterance-log" aria-label="Utterance log">
          <header className="utterance-log-header">
            <h2>Utterance log</h2>
          </header>
          <ol className="utterance-log-entries">
            {entries.map((entry) => (
              <li key={entry.id}>
                <UtteranceLogEntryBlock entry={entry} />
              </li>
            ))}
          </ol>
        </aside>
      )}
    </>
  );
}

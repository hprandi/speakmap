import { useEffect, useRef, useState } from "react";
import type { ErrorKind, UtteranceLogEntry } from "../../../orchestrator/utterance-log/UtteranceLogEntry";

const ERROR_KIND_OPTIONS: readonly { readonly kind: ErrorKind; readonly label: string }[] = [
  { kind: "transcription", label: "Transcription" },
  { kind: "interpretation", label: "Interpretation" },
  { kind: "other", label: "Other" },
];

type FlagErrorDialogProps = {
  readonly entry: UtteranceLogEntry;
  readonly onConfirm: (flaggedErrors: readonly ErrorKind[], errorNote: string) => void;
  readonly onClose: () => void;
};

export function FlagErrorDialog({ entry, onConfirm, onClose }: FlagErrorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [flaggedErrors, setFlaggedErrors] = useState(entry.flaggedErrors);
  const [errorNote, setErrorNote] = useState(entry.errorNote);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  function toggle(kind: ErrorKind) {
    const flagged = flaggedErrors.includes(kind);
    setFlaggedErrors(
      ERROR_KIND_OPTIONS.map((option) => option.kind).filter((option) =>
        option === kind ? !flagged : flaggedErrors.includes(option),
      ),
    );
  }

  return (
    <dialog ref={dialogRef} className="flag-error-dialog" onClose={onClose}>
      <form method="dialog" onSubmit={() => onConfirm(flaggedErrors, errorNote)}>
        <h3>Flag error in {entry.id}</h3>
        <fieldset>
          {ERROR_KIND_OPTIONS.map((option) => (
            <label key={option.kind}>
              <input
                type="checkbox"
                checked={flaggedErrors.includes(option.kind)}
                onChange={() => toggle(option.kind)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <label className="flag-error-note">
          Note
          <textarea value={errorNote} rows={3} onChange={(event) => setErrorNote(event.target.value)} />
        </label>
        <div className="flag-error-actions">
          <button type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="submit">Confirm</button>
        </div>
      </form>
    </dialog>
  );
}

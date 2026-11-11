import { useState, type FormEvent } from "react";
import { maskApiKey } from "./MaskApiKey";

type ApiKeySettingsProps = {
  readonly apiKey: string | null;
  readonly onSave: (apiKey: string) => void;
  readonly onClear: () => void;
};

export function ApiKeySettings({ apiKey, onSave, onClear }: ApiKeySettingsProps) {
  const [draft, setDraft] = useState("");

  function save(event: FormEvent) {
    event.preventDefault();
    if (draft.trim() === "") return;
    onSave(draft);
    setDraft("");
  }

  if (apiKey !== null) {
    return (
      <section className="api-key" aria-label="Anthropic API key">
        <span>
          Anthropic API key: <code>{maskApiKey(apiKey)}</code>
        </span>
        <button type="button" onClick={onClear}>
          Clear key
        </button>
      </section>
    );
  }

  return (
    <form className="api-key" aria-label="Anthropic API key" onSubmit={save}>
      <label>
        Anthropic API key
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="sk-ant-..."
        />
      </label>
      <button type="submit">Save key</button>
      <p className="api-key-hint">
        Use a dedicated key with a spending limit. It is stored only in this browser and sent only to Anthropic.
      </p>
    </form>
  );
}

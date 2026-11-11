import { useMemo, useState } from "react";
import type { Interpreter } from "../../domain/Interpreter";
import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import type { Transcriber } from "../../domain/Transcriber";
import type { GraphStore } from "../../editor/GraphStore";
import { Orchestrator } from "../../orchestrator/Orchestrator";
import { ApiKeySettings } from "../features/api-key/ApiKeySettings";
import { ApiKeyStorage } from "../features/api-key/ApiKeyStorage";
import { CycleStatusBar } from "../features/cycle/CycleStatusBar";
import { PushToTalkHint } from "../features/push-to-talk/PushToTalkHint";
import { usePushToTalk } from "../features/push-to-talk/UsePushToTalk";

const apiKeyStorage = new ApiKeyStorage();

// The speech language selector comes with task 8.3.
const LANGUAGE: SpeechLanguage = "en-US";

export type AppProps = {
  readonly transcriber: Transcriber;
  readonly graphStore: GraphStore;
  readonly createInterpreter: (apiKey: string) => Interpreter;
};

export function App({ transcriber, graphStore, createInterpreter }: AppProps) {
  const [apiKey, setApiKey] = useState(() => apiKeyStorage.get());
  const supported = transcriber.isSupported();
  const hasApiKey = apiKey !== null;

  const orchestrator = useMemo(
    () => new Orchestrator({ transcriber, graphStore, interpreter: createInterpreter(apiKey ?? "") }),
    [transcriber, graphStore, createInterpreter, apiKey],
  );
  usePushToTalk(orchestrator, LANGUAGE, supported && hasApiKey);

  function saveApiKey(key: string) {
    apiKeyStorage.set(key);
    setApiKey(apiKeyStorage.get());
  }

  function clearApiKey() {
    apiKeyStorage.clear();
    setApiKey(null);
  }

  return (
    <main className="app">
      <h1>Speakmap</h1>
      <ApiKeySettings apiKey={apiKey} onSave={saveApiKey} onClear={clearApiKey} />
      <PushToTalkHint supported={supported} hasApiKey={hasApiKey} />
      <CycleStatusBar orchestrator={orchestrator} />
    </main>
  );
}

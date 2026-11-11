import { useState } from "react";
import { ApiKeySettings } from "../features/api-key/ApiKeySettings";
import { ApiKeyStorage } from "../features/api-key/ApiKeyStorage";
import { PushToTalkHint } from "../features/push-to-talk/PushToTalkHint";

const apiKeyStorage = new ApiKeyStorage();

export function App() {
  const [apiKey, setApiKey] = useState(() => apiKeyStorage.get());
  const pushToTalkEnabled = apiKey !== null;

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
      <PushToTalkHint enabled={pushToTalkEnabled} />
    </main>
  );
}

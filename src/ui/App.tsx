import { useState } from "react";
import { ApiKeySettings } from "./ApiKeySettings";
import { ApiKeyStorage } from "./ApiKeyStorage";

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
      <p className="push-to-talk" data-enabled={pushToTalkEnabled}>
        {pushToTalkEnabled ? "Hold Space and speak." : "Enter your Anthropic API key to start."}
      </p>
    </main>
  );
}

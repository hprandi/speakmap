import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { GraphStore } from "./editor/GraphStore";
import { ClaudeInterpreter } from "./interpreter/claude/ClaudeInterpreter";
import { MermaidRenderer } from "./renderer/mermaid/MermaidRenderer";
import { WebSpeechTranscriber } from "./transcriber/web-speech/WebSpeechTranscriber";
import { App } from "./ui/app/App";

const transcriber = new WebSpeechTranscriber();
const graphStore = new GraphStore();
const createInterpreter = (apiKey: string) => ClaudeInterpreter.withApiKey(apiKey);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      transcriber={transcriber}
      graphStore={graphStore}
      createInterpreter={createInterpreter}
      Renderer={MermaidRenderer}
    />
  </StrictMode>,
);

import { useEffect } from "react";
import type { SpeechLanguage } from "../../../domain/SpeechLanguage";
import type { Orchestrator } from "../../../orchestrator/Orchestrator";

/** Space held: listen. Space released: process. Esc: cancel. Keys typed into text fields are left alone. */
export function usePushToTalk(orchestrator: Orchestrator, language: SpeechLanguage, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event)) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) orchestrator.startCapture(language);
      } else if (event.code === "Escape") {
        orchestrator.cancel();
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (isTyping(event) || event.code !== "Space") return;
      event.preventDefault();
      void orchestrator.stopCapture();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [orchestrator, language, enabled]);
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

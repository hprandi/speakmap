import { describe, expect, it } from "vitest";
import { SpeechLanguageStorage } from "./SpeechLanguageStorage";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  } as Storage;
}

describe("SpeechLanguageStorage", () => {
  describe("Speech language selection", () => {
    it("when nothing is stored, then the language is en-US", () => {
      expect(new SpeechLanguageStorage(memoryStorage()).get()).toBe("en-US");
    });

    it("when pt-BR is chosen, then a new instance on the same storage reads it back", () => {
      const storage = memoryStorage();
      new SpeechLanguageStorage(storage).set("pt-BR");
      expect(new SpeechLanguageStorage(storage).get()).toBe("pt-BR");
    });

    it("when the stored value is not a supported language, then the language is en-US", () => {
      const storage = memoryStorage();
      storage.setItem("speakmap.speechLanguage", "fr-FR");
      expect(new SpeechLanguageStorage(storage).get()).toBe("en-US");
    });
  });
});

import type { SpeechLanguage } from "../../../domain/SpeechLanguage";

const STORAGE_KEY = "speakmap.speechLanguage";
const DEFAULT_LANGUAGE: SpeechLanguage = "en-US";
const LANGUAGES: readonly SpeechLanguage[] = ["en-US", "pt-BR"];

export class SpeechLanguageStorage {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  get(): SpeechLanguage {
    const stored = this.storage.getItem(STORAGE_KEY);
    return LANGUAGES.find((language) => language === stored) ?? DEFAULT_LANGUAGE;
  }

  set(language: SpeechLanguage): void {
    this.storage.setItem(STORAGE_KEY, language);
  }
}

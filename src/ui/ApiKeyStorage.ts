const STORAGE_KEY = "speakmap.anthropicApiKey";

export class ApiKeyStorage {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  get(): string | null {
    return this.storage.getItem(STORAGE_KEY);
  }

  set(apiKey: string): void {
    this.storage.setItem(STORAGE_KEY, apiKey.trim());
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}

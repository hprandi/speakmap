import { describe, expect, it } from "vitest";
import { ApiKeyStorage } from "./ApiKeyStorage";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  } as Storage;
}

describe("ApiKeyStorage", () => {
  describe("API key stays in the user's browser", () => {
    it("when a key is saved, then a new instance on the same storage reads it back", () => {
      const storage = memoryStorage();
      new ApiKeyStorage(storage).set("  sk-ant-test-key  ");
      expect(new ApiKeyStorage(storage).get()).toBe("sk-ant-test-key");
    });

    it("when the key is cleared, then no key is stored", () => {
      const keys = new ApiKeyStorage(memoryStorage());
      keys.set("sk-ant-test-key");
      keys.clear();
      expect(keys.get()).toBeNull();
    });
  });
});

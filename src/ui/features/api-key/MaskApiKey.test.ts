import { describe, expect, it } from "vitest";
import { maskApiKey } from "./MaskApiKey";

describe("maskApiKey", () => {
  describe("API key stays in the user's browser", () => {
    it("when a key is masked, then only its start and end are shown", () => {
      expect(maskApiKey("sk-ant-api03-abcdefghijklmnop-wxyz")).toBe("sk-ant-…wxyz");
    });
  });
});

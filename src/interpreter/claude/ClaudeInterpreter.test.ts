import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { Graph } from "../../domain/Graph";
import { InterpretationError } from "../../domain/Interpreter";
import { ClaudeInterpreter, MODEL, type MessagesClient } from "./ClaudeInterpreter";

const graph: Graph = {
  nodes: [
    { id: 1, text: "Product" },
    { id: 2, text: "Price", parentId: 1 },
  ],
  focusId: 2,
  nextId: 3,
};

function interpreterReturning(parsedOutput: unknown, stopReason = "end_turn") {
  const parse = vi.fn().mockResolvedValue({ stop_reason: stopReason, parsed_output: parsedOutput });
  const client = { messages: { parse } } as unknown as MessagesClient;
  return { interpreter: new ClaudeInterpreter(client), parse };
}

function interpreterFailing(error: unknown) {
  const parse = vi.fn().mockRejectedValue(error);
  const client = { messages: { parse } } as unknown as MessagesClient;
  return new ClaudeInterpreter(client);
}

/** Builds the SDK error class the client throws for this HTTP status. */
function apiError(status: number) {
  return Anthropic.APIError.generate(status, undefined, "error", new Headers());
}

function interpret(interpreter: ClaudeInterpreter, transcript = "what about a subscription") {
  return interpreter.interpret(transcript, graph, "en-US", new AbortController().signal);
}

describe("ClaudeInterpreter", () => {
  describe("Interpretation input", () => {
    it("when interpreting, then the request carries the transcript, the speech language and the graph", async () => {
      const { interpreter, parse } = interpreterReturning({ result: { operations: [{ type: "undo" }] } });
      await interpret(interpreter);
      const [request] = parse.mock.calls[0];
      expect(JSON.parse(request.messages[0].content)).toEqual({
        speechLanguage: "en-US",
        graph,
        transcript: "what about a subscription",
      });
    });

    it("when interpreting, then it uses the configured model at low effort with a structured output", async () => {
      const { interpreter, parse } = interpreterReturning({ result: { operations: [{ type: "undo" }] } });
      await interpret(interpreter);
      const [request] = parse.mock.calls[0];
      expect(request.model).toBe(MODEL);
      expect(request.output_config.effort).toBe("low");
      expect(request.output_config.format.type).toBe("json_schema");
    });

    it("when interpreting, then the abort signal is passed to the SDK", async () => {
      const { interpreter, parse } = interpreterReturning({ result: { operations: [{ type: "undo" }] } });
      const controller = new AbortController();
      await interpreter.interpret("undo", graph, "en-US", controller.signal);
      expect(parse.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });
  });

  describe("Interpretation output is operations or an error", () => {
    it("when the model adds a node without parent, then the operation has no parent id", async () => {
      const { interpreter } = interpreterReturning({
        result: { operations: [{ type: "add_node", text: "Subscription", parentId: null }] },
      });
      await expect(interpret(interpreter)).resolves.toEqual({ operations: [{ type: "add_node", text: "Subscription" }] });
    });

    it("when the model adds a node with a parent, then the operation keeps the parent id", async () => {
      const { interpreter } = interpreterReturning({
        result: { operations: [{ type: "add_node", text: "Audience", parentId: 1 }] },
      });
      await expect(interpret(interpreter, "under 1, add audience")).resolves.toEqual({
        operations: [{ type: "add_node", text: "Audience", parentId: 1 }],
      });
    });

    it("when the model adds several nodes, then all operations are returned in order", async () => {
      const { interpreter } = interpreterReturning({
        result: {
          operations: [
            { type: "add_node", text: "Monthly", parentId: null },
            { type: "add_node", text: "Yearly", parentId: null },
          ],
        },
      });
      const result = await interpret(interpreter, "price can be monthly or yearly");
      expect(result).toEqual({
        operations: [
          { type: "add_node", text: "Monthly" },
          { type: "add_node", text: "Yearly" },
        ],
      });
    });
  });

  describe("Undo requests are recognized", () => {
    it("when the model returns undo, then the result is one undo operation", async () => {
      const { interpreter } = interpreterReturning({ result: { operations: [{ type: "undo" }] } });
      await expect(interpret(interpreter, "undo that")).resolves.toEqual({ operations: [{ type: "undo" }] });
    });
  });

  describe("Utterances without operations return an explained error", () => {
    it("when the model returns an error, then its message is returned as is", async () => {
      const { interpreter } = interpreterReturning({ result: { error: { message: "There was no idea to add." } } });
      await expect(interpret(interpreter, "hmm, let me think")).resolves.toEqual({
        error: { message: "There was no idea to add." },
      });
    });
  });

  describe("Interpretation failures are reported", () => {
    it("when the operations list is empty, then it fails as a malformed response", async () => {
      const { interpreter } = interpreterReturning({ result: { operations: [] } });
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "malformed-response" });
    });

    it("when there is no parsed output, then it fails as a malformed response", async () => {
      const { interpreter } = interpreterReturning(null);
      const error = await interpret(interpreter).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(InterpretationError);
      expect(error).toMatchObject({ reason: "malformed-response" });
    });

    it("when the model refuses, then it fails as refused", async () => {
      const { interpreter } = interpreterReturning(null, "refusal");
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "refused" });
    });

    it("when the answer is cut off by max tokens, then it fails as a malformed response", async () => {
      const { interpreter } = interpreterReturning({ result: { operations: [{ type: "undo" }] } }, "max_tokens");
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "malformed-response" });
    });

    it("when the SDK cannot parse the answer, then it fails as a malformed response", async () => {
      const interpreter = interpreterFailing(new Anthropic.AnthropicError("Failed to parse structured output"));
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "malformed-response" });
    });

    it("when the key is rejected, then it fails as an invalid key", async () => {
      const interpreter = interpreterFailing(apiError(401));
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "invalid-key" });
    });

    it("when rate limited, then it fails as rate limited", async () => {
      const interpreter = interpreterFailing(apiError(429));
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "rate-limited" });
    });

    it("when the network fails, then it fails as a network error", async () => {
      const interpreter = interpreterFailing(new Anthropic.APIConnectionError({ message: "Connection error." }));
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "network" });
    });

    it("when the request times out, then it fails as a network error", async () => {
      const interpreter = interpreterFailing(new Anthropic.APIConnectionTimeoutError());
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "network" });
    });

    it("when the request is aborted, then it fails as aborted", async () => {
      const interpreter = interpreterFailing(new Anthropic.APIUserAbortError());
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "aborted" });
    });

    it("when the API returns another error, then it fails as an API error with the status", async () => {
      const interpreter = interpreterFailing(apiError(500));
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "api-error", message: expect.stringContaining("500") });
    });

    it("when an unexpected error is thrown, then it fails as an API error", async () => {
      const interpreter = interpreterFailing(new TypeError("boom"));
      await expect(interpret(interpreter)).rejects.toMatchObject({ reason: "api-error" });
    });

    it("when it fails, then the error is an InterpretationError with an app-written message", async () => {
      const interpreter = interpreterFailing(apiError(401));
      const error = await interpret(interpreter).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(InterpretationError);
      expect(error).toMatchObject({ message: "The Anthropic API key is invalid. Check it and try again." });
    });
  });
});

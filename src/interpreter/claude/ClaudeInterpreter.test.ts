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

/** Parses the response content with the output format of the request, as the SDK does. */
function interpreterAnswering(responseContent: unknown) {
  const parse = vi.fn().mockImplementation(async (request: { output_config: { format: { parse(content: string): unknown } } }) => ({
    stop_reason: "end_turn",
    parsed_output: request.output_config.format.parse(JSON.stringify(responseContent)),
  }));
  const client = { messages: { parse } } as unknown as MessagesClient;
  return new ClaudeInterpreter(client);
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

  describe("Interpretation returns operations or an error", () => {
    it("when the response contains several operations, then they are returned in order", async () => {
      // given
      const interpreter = interpreterAnswering({
        result: {
          operations: [
            { type: "add_node", text: "Price", parentId: 1 },
            { type: "set_text", id: 3, text: "Customers" },
          ],
        },
      });

      // when
      const result = await interpret(interpreter);

      // then
      expect(result).toEqual({
        operations: [
          { type: "add_node", text: "Price", parentId: 1 },
          { type: "set_text", id: 3, text: "Customers" },
        ],
      });
    });

    it("when the response contains each kind of operation, then each one is returned", async () => {
      // given
      const interpreter = interpreterAnswering({
        result: {
          operations: [
            { type: "delete_node", id: 4 },
            { type: "set_parent", id: 5, parentId: 2 },
            { type: "set_parent", id: 2, parentId: null },
            { type: "set_focus", id: 3 },
          ],
        },
      });

      // when
      const result = await interpret(interpreter);

      // then
      expect(result).toEqual({
        operations: [
          { type: "delete_node", id: 4 },
          { type: "set_parent", id: 5, parentId: 2 },
          { type: "set_parent", id: 2 },
          { type: "set_focus", id: 3 },
        ],
      });
    });

    it("when the response adds a node without a parent, then the operation has no parent label", async () => {
      // given
      const interpreter = interpreterAnswering({
        result: { operations: [{ type: "add_node", text: "Product", parentId: null }] },
      });

      // when
      const result = await interpret(interpreter);

      // then
      expect(result).toEqual({ operations: [{ type: "add_node", text: "Product" }] });
    });

    it("when the response contains undo, then the result is one undo operation", async () => {
      // given
      const interpreter = interpreterAnswering({ result: { operations: [{ type: "undo" }] } });

      // when
      const result = await interpret(interpreter, "undo that");

      // then
      expect(result).toEqual({ operations: [{ type: "undo" }] });
    });

    it("when the response has an empty list of operations, then it fails as a malformed response", async () => {
      // given
      const interpreter = interpreterAnswering({ result: { operations: [] } });

      // when
      const failure = interpret(interpreter);

      // then
      await expect(failure).rejects.toMatchObject({ reason: "malformed-response" });
    });
  });

  describe("Interpretation errors are returned as written", () => {
    it("when the response is an error, then its message is returned as written", async () => {
      // given
      const interpreter = interpreterAnswering({
        result: { error: { message: "Não havia nenhuma ideia para adicionar." } },
      });

      // when
      const result = await interpret(interpreter, "hmm, deixa eu pensar");

      // then
      expect(result).toEqual({ error: { message: "Não havia nenhuma ideia para adicionar." } });
    });
  });

  describe("Interpretation failures are reported", () => {
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

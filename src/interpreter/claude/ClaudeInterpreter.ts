import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Graph } from "../../domain/Graph";
import { InterpretationError, type InterpretationResult, type Interpreter } from "../../domain/Interpreter";
import type { Operation } from "../../domain/Operation";
import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import { OutputSchema, type Output, type OutputOperation } from "./OutputSchema";
import { SYSTEM_PROMPT } from "./SystemPrompt";

export const MODEL = "claude-haiku-5-5";
export const MAX_TOKENS = 16000

export type MessagesClient = Pick<Anthropic, "messages">;

export class ClaudeInterpreter implements Interpreter {
  private readonly client: MessagesClient;

  constructor(client: MessagesClient) {
    this.client = client;
  }

  /** The key belongs to the user and stays in their browser, so the SDK may run there (design D9). */
  static withApiKey(apiKey: string): ClaudeInterpreter {
    return new ClaudeInterpreter(new Anthropic({ apiKey, dangerouslyAllowBrowser: true }));
  }

  async interpret(
    transcript: string,
    graph: Graph,
    language: SpeechLanguage,
    signal: AbortSignal,
  ): Promise<InterpretationResult> {
    let response;
    try {
      response = await this.client.messages.parse(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          output_config: { effort: "low", format: zodOutputFormat(OutputSchema) },
          messages: [{ role: "user", content: this.userMessage(transcript, graph, language) }],
        },
        { signal },
      );
    } catch (error) {
      throw this.toFailure(error);
    }

    if (response.stop_reason === "refusal") {
      throw new InterpretationError("refused", "Claude declined to interpret this. Try saying it differently.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new InterpretationError("malformed-response", "Claude's answer was cut off. Please try again.");
    }
    return this.toResult(response.parsed_output);
  }

  private userMessage(transcript: string, graph: Graph, language: SpeechLanguage): string {
    return JSON.stringify({ speechLanguage: language, graph, transcript });
  }

  private toResult(output: Output | null): InterpretationResult {
    if (output === null) {
      throw new InterpretationError("malformed-response", "Claude's answer could not be understood. Please try again.");
    }
    if ("error" in output.result) {
      return { error: { message: output.result.error.message } };
    }
    if (output.result.operations.length === 0) {
      throw new InterpretationError("malformed-response", "Claude's answer had no operations. Please try again.");
    }
    return { operations: output.result.operations.map((operation) => this.toOperation(operation)) };
  }

  private toOperation(operation: OutputOperation): Operation {
    if (operation.type === "undo") return { type: "undo" };
    return operation.parentId === null
      ? { type: "add_node", text: operation.text }
      : { type: "add_node", text: operation.text, parentId: operation.parentId };
  }

  /** Most specific first: abort and connection errors are subclasses of APIError in the SDK. */
  private toFailure(error: unknown): InterpretationError {
    if (error instanceof Anthropic.APIUserAbortError) {
      return new InterpretationError("aborted", "The interpretation was cancelled.");
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return new InterpretationError("invalid-key", "The Anthropic API key is invalid. Check it and try again.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new InterpretationError("rate-limited", "Too many requests to the Anthropic API. Wait a moment and try again.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return new InterpretationError("network", "Could not reach the Anthropic API. Check your connection and try again.");
    }
    if (error instanceof Anthropic.APIError) {
      return new InterpretationError("api-error", `The Anthropic API returned an error (${error.status ?? "unknown"}). Please try again.`);
    }
    if (error instanceof Anthropic.AnthropicError) {
      return new InterpretationError("malformed-response", "Claude's answer could not be understood. Please try again.");
    }
    return new InterpretationError("api-error", "The interpretation failed unexpectedly. Please try again.");
  }
}

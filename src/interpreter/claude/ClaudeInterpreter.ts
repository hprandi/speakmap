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
    const response = await this.client.messages.parse(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        output_config: { effort: "low", format: zodOutputFormat(OutputSchema) },
        messages: [{ role: "user", content: this.userMessage(transcript, graph, language) }],
      },
      { signal },
    );

    return this.toResult(response.parsed_output);
  }

  private userMessage(transcript: string, graph: Graph, language: SpeechLanguage): string {
    return JSON.stringify({ speechLanguage: language, graph, transcript });
  }

  private toResult(output: Output | null): InterpretationResult {
    if (output === null) {
      throw new InterpretationError("malformed-response", "The interpretation response could not be read.");
    }
    if ("error" in output.result) {
      return { error: { message: output.result.error.message } };
    }
    if (output.result.operations.length === 0) {
      throw new InterpretationError("malformed-response", "The interpretation response had no operations.");
    }
    return { operations: output.result.operations.map((operation) => this.toOperation(operation)) };
  }

  private toOperation(operation: OutputOperation): Operation {
    if (operation.type === "undo") return { type: "undo" };
    return operation.parentId === null
      ? { type: "add_node", text: operation.text }
      : { type: "add_node", text: operation.text, parentId: operation.parentId };
  }
}

import type { Graph } from "../../domain/Graph";
import type { InterpretationResult, Interpreter } from "../../domain/Interpreter";
import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import { deferred } from "./Deferred";

export class FakeInterpreter implements Interpreter {
  calls: { transcript: string; graph: Graph; language: SpeechLanguage; signal: AbortSignal }[] = [];
  result = deferred<InterpretationResult>();

  interpret(transcript: string, graph: Graph, language: SpeechLanguage, signal: AbortSignal): Promise<InterpretationResult> {
    this.calls.push({ transcript, graph, language, signal });
    return this.result.promise;
  }
}

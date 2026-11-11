import type { Graph } from "../../domain/Graph";
import type { InterpretationResult, Interpreter } from "../../domain/Interpreter";
import type { SpeechLanguage } from "../../domain/SpeechLanguage";
import { deferred } from "./Deferred";

export class FakeInterpreter implements Interpreter {
  calls: { transcript: string; graph: Graph; language: SpeechLanguage }[] = [];
  result = deferred<InterpretationResult>();

  interpret(transcript: string, graph: Graph, language: SpeechLanguage): Promise<InterpretationResult> {
    this.calls.push({ transcript, graph, language });
    return this.result.promise;
  }
}

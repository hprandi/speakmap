import type { Graph } from "../../domain/Graph";
import type { Cycle } from "../Cycle";
import type { ErrorKind, UtteranceLogEntry, UtteranceOutcome } from "./UtteranceLogEntry";

export type UtteranceLogListener = (entries: readonly UtteranceLogEntry[]) => void;

export class UtteranceLog {
  private entries: readonly UtteranceLogEntry[] = [];
  private readonly listeners = new Set<UtteranceLogListener>();

  getEntries(): readonly UtteranceLogEntry[] {
    return this.entries;
  }

  subscribe(listener: UtteranceLogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  record(cycle: Cycle, outcome: UtteranceOutcome, graphAfter: Graph, reason?: string): void {
    const entry: UtteranceLogEntry = {
      id: `U${this.entries.length + 1}`,
      time: new Date().toISOString(),
      language: cycle.language,
      transcript: cycle.transcript,
      interpretation: cycle.interpretation,
      outcome,
      reason,
      graphBefore: cycle.graphBefore,
      graphAfter,
      flaggedErrors: [],
      errorNote: "",
    };
    this.setEntries([...this.entries, entry]);
  }

  flagErrors(id: string, flaggedErrors: readonly ErrorKind[], errorNote: string): void {
    this.setEntries(this.entries.map((entry) => (entry.id === id ? { ...entry, flaggedErrors, errorNote } : entry)));
  }

  toJson(): string {
    return JSON.stringify({ entries: this.entries }, null, 2);
  }

  private setEntries(entries: readonly UtteranceLogEntry[]): void {
    this.entries = entries;
    for (const listener of this.listeners) listener(entries);
  }
}

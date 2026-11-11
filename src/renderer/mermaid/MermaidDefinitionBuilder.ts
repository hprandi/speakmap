import type { Graph, GraphNode } from "../../domain/Graph";

const FOCUS_STYLE = "fill:#ffe08a,stroke:#b8860b,stroke-width:2px";

// Characters with meaning in Mermaid syntax, Markdown strings or HTML.
const UNSAFE_CHARACTERS = /["#&<>[\](){}|`\\]/g;

export class MermaidDefinitionBuilder {
  build(graph: Graph): string {
    const lines = ["flowchart TD"];

    for (const node of graph.nodes) lines.push(`  ${this.nodeLine(node)}`);
    for (const node of graph.nodes) {
      if (node.parentId !== undefined) lines.push(`  ${this.nodeId(node.parentId)} --> ${this.nodeId(node.id)}`);
    }
    if (graph.focusId !== undefined) {
      lines.push(`  classDef focus ${FOCUS_STYLE}`);
      lines.push(`  class ${this.nodeId(graph.focusId)} focus`);
    }

    return lines.join("\n");
  }

  private nodeLine(node: GraphNode): string {
    return `${this.nodeId(node.id)}["${node.id} · ${this.escape(node.text)}"]`;
  }

  private nodeId(id: number): string {
    return `n${id}`;
  }

  /** Replaces unsafe characters with Mermaid entity codes (#<code>;) and line breaks with spaces. */
  private escape(text: string): string {
    return text.replace(/\s+/g, " ").replace(UNSAFE_CHARACTERS, (character) => `#${character.charCodeAt(0)};`);
  }
}

import type { Graph, GraphNode } from "../domain/Graph";

type IntegrityRule = (graph: Graph) => string | undefined;

export class IntegrityRules {
  private readonly rulesInReportOrder: readonly IntegrityRule[] = [
    nonEmptyTexts,
    existingParents,
    noNodeUnderItsOwnDescendant,
    singleRoot,
    existingFocus,
  ];

  validate(graph: Graph): string | undefined {
    for (const rule of this.rulesInReportOrder) {
      const violation = rule(graph);
      if (violation !== undefined) return violation;
    }
    return undefined;
  }
}

function nonEmptyTexts(graph: Graph): string | undefined {
  return graph.nodes.some((node) => node.text === "") ? "A node cannot have an empty text." : undefined;
}

function existingParents(graph: Graph): string | undefined {
  const ids = new Set(graph.nodes.map((node) => node.id));
  const orphan = graph.nodes.find((node) => node.parentId !== undefined && !ids.has(node.parentId));
  return orphan === undefined ? undefined : `Node ${orphan.parentId} does not exist.`;
}

function noNodeUnderItsOwnDescendant(graph: Graph): string | undefined {
  const parentIds = new Map(graph.nodes.map((node) => [node.id, node.parentId]));
  const looping = graph.nodes.find((node) => isUnderItself(node, parentIds));
  return looping === undefined ? undefined : `Node ${looping.id} cannot be under its own descendant.`;
}

function isUnderItself(node: GraphNode, parentIds: ReadonlyMap<number, number | undefined>): boolean {
  const visited = new Set<number>();
  let ancestorId = node.parentId;
  while (ancestorId !== undefined && !visited.has(ancestorId)) {
    if (ancestorId === node.id) return true;
    visited.add(ancestorId);
    ancestorId = parentIds.get(ancestorId);
  }
  return false;
}

function singleRoot(graph: Graph): string | undefined {
  const roots = graph.nodes.filter((node) => node.parentId === undefined);
  return roots.length < 2 ? undefined : `Nodes ${roots[0].id} and ${roots[1].id} are both roots.`;
}

function existingFocus(graph: Graph): string | undefined {
  const { focusId } = graph;
  if (focusId === undefined || graph.nodes.some((node) => node.id === focusId)) return undefined;
  return `Node ${focusId} does not exist.`;
}

import { useSyncExternalStore } from "react";
import type { Graph } from "../../../domain/Graph";
import type { GraphStore } from "../../../editor/GraphStore";

export function useGraph(graphStore: GraphStore): Graph {
  return useSyncExternalStore(
    (onChange) => graphStore.subscribe(onChange),
    () => graphStore.getGraph(),
  );
}

import type { ComponentType } from "react";
import type { RendererProps } from "../../../domain/RendererProps";
import type { GraphStore } from "../../../editor/GraphStore";
import { RendererErrorBoundary } from "./RendererErrorBoundary";
import { useGraph } from "./UseGraph";

type GraphViewProps = {
  readonly graphStore: GraphStore;
  readonly Renderer: ComponentType<RendererProps>;
};

/** The renderer slot: the hint and the error message stay here when the renderer is replaced (design D7). */
export function GraphView({ graphStore, Renderer }: GraphViewProps) {
  const graph = useGraph(graphStore);

  return (
    <section className="graph-view" aria-label="Mind map">
      {graph.nodes.length === 0 ? (
        <p className="graph-view-hint">Hold Space and speak to add your first idea.</p>
      ) : (
        <RendererErrorBoundary resetKey={graph}>
          <Renderer graph={graph} />
        </RendererErrorBoundary>
      )}
    </section>
  );
}

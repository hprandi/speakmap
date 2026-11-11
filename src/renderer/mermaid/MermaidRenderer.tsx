import mermaid from "mermaid";
import { useEffect, useState } from "react";
import type { RendererProps } from "../../domain/RendererProps";
import { MermaidDefinitionBuilder } from "./MermaidDefinitionBuilder";

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

const builder = new MermaidDefinitionBuilder();
let renderCount = 0;

type Drawing = { readonly svg: string } | { readonly error: unknown };

export function MermaidRenderer({ graph }: RendererProps) {
  const [drawing, setDrawing] = useState<Drawing>();

  useEffect(() => {
    // Ignores a slower, older render that finishes after a newer graph arrived.
    let isCurrent = true;
    renderCount += 1;

    mermaid
      .render(`mermaid-diagram-${renderCount}`, builder.build(graph))
      .then(({ svg }) => isCurrent && setDrawing({ svg }))
      .catch((error: unknown) => isCurrent && setDrawing({ error }));

    return () => {
      isCurrent = false;
    };
  }, [graph]);

  if (drawing === undefined) return null;
  if ("error" in drawing) throw drawing.error;

  // The SVG comes from Mermaid with securityLevel "strict", which sanitizes node texts.
  return <div className="renderer-diagram" dangerouslySetInnerHTML={{ __html: drawing.svg }} />;
}

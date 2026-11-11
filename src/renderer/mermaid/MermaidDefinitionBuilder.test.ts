import { describe, expect, it } from "vitest";
import { EMPTY_GRAPH, type Graph } from "../../domain/Graph";
import { MermaidDefinitionBuilder } from "./MermaidDefinitionBuilder";

const builder = new MermaidDefinitionBuilder();

const tree: Graph = {
  nodes: [
    { id: 1, text: "Product" },
    { id: 2, text: "Price", parentId: 1 },
    { id: 3, text: "Public", parentId: 1 },
  ],
  focusId: 3,
  nextId: 4,
};

function graphWithText(text: string): Graph {
  return { nodes: [{ id: 1, text }], focusId: 1, nextId: 2 };
}

describe("MermaidDefinitionBuilder", () => {
  describe("Graph is drawn from its current state", () => {
    it("when the graph is a tree, then every node and every parent edge is drawn", () => {
      expect(builder.build(tree)).toBe(
        [
          "flowchart TD",
          '  n1["1 · Product"]',
          '  n2["2 · Price"]',
          '  n3["3 · Public"]',
          "  n1 --> n2",
          "  n1 --> n3",
          "  classDef focus fill:#ffe08a,stroke:#b8860b,stroke-width:2px",
          "  class n3 focus",
        ].join("\n"),
      );
    });

    it("when the graph is empty, then the definition has only the header", () => {
      expect(builder.build(EMPTY_GRAPH)).toBe("flowchart TD");
    });
  });

  describe("Ids are visible", () => {
    it("when a node has a text, then its id is shown before the text", () => {
      expect(builder.build(tree)).toContain('n2["2 · Price"]');
    });
  });

  describe("Focus is highlighted", () => {
    it("when a node has focus, then only that node gets the focus class", () => {
      const classLines = builder.build(tree).split("\n").filter((line) => line.trim().startsWith("class "));
      expect(classLines).toEqual(["  class n3 focus"]);
    });
  });

  describe("Node text is displayed safely", () => {
    it("when the text has quotes, then they are escaped", () => {
      expect(builder.build(graphWithText('Say "hi"'))).toContain('n1["1 · Say #34;hi#34;"]');
    });

    it("when the text has brackets, then they are escaped", () => {
      expect(builder.build(graphWithText("a[b](c){d}"))).toContain('n1["1 · a#91;b#93;#40;c#41;#123;d#125;"]');
    });

    it("when the text has an arrow, then it is escaped", () => {
      expect(builder.build(graphWithText("a --> b"))).toContain('n1["1 · a --#62; b"]');
    });

    it("when the text has markup or entity characters, then they are escaped", () => {
      expect(builder.build(graphWithText("<b>#1 & `x`</b>"))).toContain(
        'n1["1 · #60;b#62;#35;1 #38; #96;x#96;#60;/b#62;"]',
      );
    });

    it("when the text has line breaks, then they become spaces", () => {
      expect(builder.build(graphWithText("a\nb"))).toContain('n1["1 · a b"]');
    });
  });
});

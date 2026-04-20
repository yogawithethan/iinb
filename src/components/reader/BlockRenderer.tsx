import type { ChapterBlock } from "@/content/chapters";

export function BlockRenderer({ block }: { block: ChapterBlock }) {
  switch (block.type) {
    case "heading": {
      if (block.level === 1)
        return <h1 dangerouslySetInnerHTML={{ __html: block.html }} />;
      if (block.level === 2)
        return <h2 dangerouslySetInnerHTML={{ __html: block.html }} />;
      return <h3 dangerouslySetInnerHTML={{ __html: block.html }} />;
    }
    case "paragraph":
      return <p dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "blockquote":
      return (
        <blockquote
          className="reader-blockquote"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "separator":
      return (
        <hr
          className="reader-hr"
          aria-hidden="true"
          style={{
            border: 0,
            height: "1px",
            margin: "2em auto",
            width: "40%",
            background:
              "color-mix(in srgb, var(--ink-tertiary) 40%, transparent)",
          }}
        />
      );
  }
}

import { memo } from "react";
import type { ChapterBlock } from "@/content/chapters";
import { AudioClip } from "./AudioClip";

type Props = { block: ChapterBlock; anchor?: string };

export const BlockRenderer = memo(BlockRendererImpl);

function BlockRendererImpl({ block, anchor }: Props) {
  switch (block.type) {
    case "heading": {
      const cls = `reader-heading reader-heading--h${block.level}`;
      const common = {
        "data-p-anchor": anchor,
        className: cls,
        dangerouslySetInnerHTML: { __html: block.html },
      };
      if (block.level === 1) return <h1 {...common} />;
      if (block.level === 2) return <h2 {...common} />;
      return <h3 {...common} />;
    }
    case "paragraph":
      return (
        <p
          data-p-anchor={anchor}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "blockquote":
      return (
        <blockquote
          data-p-anchor={anchor}
          className="reader-blockquote"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "audio":
      return <AudioClip src={block.src} label={block.label} />;
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

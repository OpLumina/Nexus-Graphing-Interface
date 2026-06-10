import { useMemo } from "react";
import katex from "katex";

interface Props {
  latex: string;
  displayMode?: boolean;
  style?: React.CSSProperties;
}

export function MathDisplay({ latex, displayMode = false, style }: Props) {
  const html = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        trust: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return (
      <code style={{ fontFamily: "monospace", fontSize: 12, color: "#e8e8e8", ...style }}>
        {latex}
      </code>
    );
  }

  return (
    <span
      style={{ color: "#e8e8e8", ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

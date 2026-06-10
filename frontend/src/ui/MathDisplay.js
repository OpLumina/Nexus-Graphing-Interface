import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import katex from "katex";
export function MathDisplay({ latex, displayMode = false, style }) {
    const html = useMemo(() => {
        if (!latex)
            return null;
        try {
            return katex.renderToString(latex, {
                displayMode,
                throwOnError: false,
                trust: false,
            });
        }
        catch {
            return null;
        }
    }, [latex, displayMode]);
    if (!html) {
        return (_jsx("code", { style: { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8", ...style }, children: latex }));
    }
    return (_jsx("span", { style: { color: "#e8e8e8", ...style }, dangerouslySetInnerHTML: { __html: html } }));
}

import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { getToolDef } from "../../tools/loader";
import type { ToolPanelProps } from "./registry";

const TOOL_ID = "slope";
const labelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.4)", fontSize: 11 };
const monoStyle: React.CSSProperties  = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };

export function SlopePanel({ entry }: ToolPanelProps) {
  const runTool        = useStore(s => s.runTool);
  const clearToolResult = useStore(s => s.clearToolResult);
  const toolResults    = useStore(s => s.toolResults);

  const [xInput, setXInput] = useState("0");
  const [loading, setLoading] = useState(false);

  const resultKey = `${TOOL_ID}:${entry.id}`;
  const result    = toolResults[resultKey];
  const slope     = result?.data?.slope as number | undefined;
  const y         = result?.data?.y     as number | undefined;

  useEffect(() => () => { clearToolResult(resultKey); }, []);

  const handleSet = async () => {
    const x = parseFloat(xInput);
    if (!isNaN(x)) {
      setLoading(true);
      await runTool(TOOL_ID, { x }, entry.id);
      setLoading(false);
    }
  };

  const def = getToolDef(TOOL_ID);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={labelStyle}>{def?.inputs[0]?.label ?? "x ="}</span>
        <input
          type="number"
          value={xInput}
          onChange={e => setXInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void handleSet(); }}
          style={{
            width: 64, background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3,
            color: "#e8e8e8", fontFamily: "monospace", fontSize: 12,
            padding: "1px 4px", outline: "none",
          }}
        />
        <button onClick={handleSet} disabled={loading} style={btn("#61acff")}>
          {loading ? "…" : "Set"}
        </button>
        {result && (
          <button onClick={() => clearToolResult(resultKey)} style={btn("rgba(255,255,255,0.3)")}>
            Clear
          </button>
        )}
      </div>

      {result?.error && (
        <div style={{ color: "#ff6b6b", fontSize: 11, marginTop: 4 }}>{result.error}</div>
      )}

      {result?.ok && slope !== undefined && (
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 2 }}>
          <span style={labelStyle}>slope</span>
          <span style={{ ...monoStyle, color: entry.color }}>
            {isFinite(slope) ? slope.toPrecision(6) : "undefined"}
          </span>
          <span style={labelStyle}>y</span>
          <span style={monoStyle}>
            {y !== undefined && isFinite(y) ? y.toPrecision(6) : "undefined"}
          </span>
        </div>
      )}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    background: "none", border: `1px solid ${color}`, color,
    borderRadius: 3, padding: "1px 7px", fontSize: 11, cursor: "pointer",
  };
}

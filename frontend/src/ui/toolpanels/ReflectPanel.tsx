import { useState, useEffect } from "react";
import { useStore } from "../../store";
import type { ToolPanelProps } from "./registry";

const TOOL_ID  = "reflect";
const GOLD     = "#ffc935";
const FAINT    = "rgba(255,255,255,0.4)";

interface IntersectionData {
  x: number; y: number;
  slope1: number; slope2: number;
  reflect_slope: number | null;
  description: string;
}

interface ReflectData {
  intersections: IntersectionData[];
  both_nonlinear: boolean;
}

const label: React.CSSProperties = { color: FAINT, fontSize: 11 };
const mono:  React.CSSProperties = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
const grid:  React.CSSProperties = { display: "grid", gridTemplateColumns: "110px 1fr", rowGap: 2, marginTop: 4 };

export function ReflectPanel({ entry }: ToolPanelProps) {
  const runTool         = useStore(s => s.runTool);
  const clearToolResult = useStore(s => s.clearToolResult);
  const toolResults     = useStore(s => s.toolResults);

  const [loading, setLoading] = useState(false);

  const resultKey = `${TOOL_ID}:${entry.id}`;
  const result    = toolResults[resultKey];
  const data      = result?.data as unknown as ReflectData | undefined;

  if (entry.parsed.type !== "reflect") return null;
  const { expr1, expr2 } = entry.parsed;

  useEffect(() => () => { clearToolResult(resultKey); }, []);

  const handleCompute = async () => {
    setLoading(true);
    await runTool(TOOL_ID, {}, entry.id);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: FAINT, fontSize: 12 }}>
          reflect(<span style={{ color: "#e8e8e8" }}>{expr1}</span>,{" "}
          <span style={{ color: "#e8e8e8" }}>{expr2}</span>)
        </span>
        <button onClick={handleCompute} disabled={loading} style={btn("#61acff")}>
          {loading ? "…" : "Compute"}
        </button>
      </div>

      {result?.error && (
        <div style={{ color: "#ff6b6b", fontSize: 11, marginBottom: 6 }}>{result.error}</div>
      )}

      {data?.both_nonlinear && (data.intersections.length > 0) && (
        <div style={{ color: GOLD, fontSize: 11, marginBottom: 6 }}>
          Both curves — tangent lines shown at each intersection.
        </div>
      )}

      {data?.intersections.map((pt, i) => (
        <div key={i} style={{
          marginBottom: 8, padding: "6px 8px",
          background: "rgba(255,255,255,0.04)", borderRadius: 4,
        }}>
          <div style={{ ...label, marginBottom: 2 }}>Intersection {i + 1}</div>
          <div style={{ ...mono, marginBottom: 4 }}>
            ({pt.x.toFixed(4)}, {pt.y.toFixed(4)})
          </div>
          <div style={grid}>
            <span style={label}>slope {expr1}</span>
            <span style={{ ...mono, fontSize: 11 }}>{pt.slope1.toFixed(5)}</span>
            <span style={label}>slope {expr2}</span>
            <span style={{ ...mono, fontSize: 11 }}>{pt.slope2.toFixed(5)}</span>
            {pt.reflect_slope != null && (
              <>
                <span style={{ ...label, color: GOLD }}>reflected slope</span>
                <span style={{ ...mono, fontSize: 11, color: GOLD }}>
                  {pt.reflect_slope.toFixed(5)}
                </span>
              </>
            )}
          </div>
        </div>
      ))}

      {!loading && !result && (
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          Press Compute to find intersections.
        </div>
      )}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    background: "none", border: `1px solid ${color}`, color,
    borderRadius: 3, padding: "1px 8px", fontSize: 11, cursor: "pointer",
  };
}

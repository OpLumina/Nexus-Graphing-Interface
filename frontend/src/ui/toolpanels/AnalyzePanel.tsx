import { useState, useEffect, useRef } from "react";
import { useStore } from "../../store";
import { MathDisplay } from "../MathDisplay";
import type { ToolPanelProps } from "./GenericPanel";

const dim:   React.CSSProperties = { color: "rgba(255,255,255,0.35)", fontSize: 11 };
const mono:  React.CSSProperties = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
const badge: (color: string) => React.CSSProperties = (color) => ({
  background: color + "22", border: `1px solid ${color}55`,
  borderRadius: 3, padding: "1px 5px", fontSize: 10, color,
});

interface CriticalPoint { x: number | string; y?: number; type: string }

function PointChip({ cp }: { cp: CriticalPoint }) {
  const color = cp.type === "min" ? "#6be08e" : cp.type === "max" ? "#ff6b6b" : "#ffc935";
  const xStr  = typeof cp.x === "number" ? cp.x.toPrecision(5) : String(cp.x);
  const yStr  = cp.y !== undefined && isFinite(cp.y) ? cp.y.toPrecision(5) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
      <span style={badge(color)}>{cp.type}</span>
      <span style={mono}>x = {xStr}</span>
      {yStr && <span style={{ ...mono, ...dim }}>  y = {yStr}</span>}
    </div>
  );
}

export function AnalyzePanel({ entry, def }: ToolPanelProps) {
  const runTool         = useStore(s => s.runTool);
  const clearToolResult = useStore(s => s.clearToolResult);
  const toolResults     = useStore(s => s.toolResults);

  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const resultKey = `${def.id}:${entry.id}`;
  const result    = toolResults[resultKey];

  const doRun = async () => {
    setLoading(true);
    await runTool(def.id, {}, entry.id);
    setLoading(false);
  };

  // Track which (tool, expression) pair we auto-ran for, not a bare boolean, so
  // a reused panel instance re-runs when entry.id changes (BUG-12) while still
  // deduping repeat effect fires for the same pair.
  const autoRanKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${def.id}:${entry.id}`;
    if (autoRanKeyRef.current !== key && !result) {
      autoRanKeyRef.current = key;
      void doRun();
    }
  }, [def.id, entry.id, result]);

  if (!result) {
    return <div style={{ ...dim, padding: "4px 0" }}>{loading ? "Analyzing…" : "—"}</div>;
  }

  if (!result.ok) {
    return <div style={{ color: "#ff6b6b", fontSize: 11 }}>{result.error}</div>;
  }

  const data = result.data as {
    roots: (number | string)[];
    critical_points: CriticalPoint[];
    inflection_points: (number | string)[];
    derivative_latex: string;
    second_derivative_latex: string;
  };

  const toggle = (k: string) => setExpanded(e => ({ ...e, [k]: !e[k] }));

  const Section = ({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) => (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => toggle(id)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 6, width: "100%" }}
      >
        <span style={{ ...dim, fontSize: 10 }}>{expanded[id] ? "▾" : "▸"}</span>
        <span style={{ fontSize: 12, color: "#c8c8c8" }}>{title}</span>
        <span style={{ ...dim, marginLeft: "auto" }}>({count})</span>
      </button>
      {expanded[id] && <div style={{ paddingLeft: 14, paddingTop: 4 }}>{children}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...dim, marginBottom: 2 }}>f′(x)</div>
        <MathDisplay latex={data.derivative_latex} displayMode />
      </div>

      <Section id="roots" title="Roots" count={data.roots.length}>
        {data.roots.length === 0
          ? <span style={dim}>No real roots found</span>
          : data.roots.map((r, i) => (
              <div key={i} style={{ ...mono, marginBottom: 2 }}>
                x = {typeof r === "number" ? r.toPrecision(6) : String(r)}
              </div>
            ))
        }
      </Section>

      <Section id="critical" title="Critical Points" count={data.critical_points.length}>
        {data.critical_points.length === 0
          ? <span style={dim}>None</span>
          : data.critical_points.map((cp, i) => <PointChip key={i} cp={cp} />)
        }
      </Section>

      <Section id="inflect" title="Inflection Points" count={data.inflection_points.length}>
        {data.inflection_points.length === 0
          ? <span style={dim}>None</span>
          : data.inflection_points.map((p, i) => (
              <div key={i} style={{ ...mono, marginBottom: 2 }}>
                x = {typeof p === "number" ? (p as number).toPrecision(6) : String(p)}
              </div>
            ))
        }
      </Section>

      <Section id="deriv2" title="f″(x)" count={0}>
        <MathDisplay latex={data.second_derivative_latex} displayMode />
      </Section>

      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={doRun} disabled={loading} style={btn("#61acff")}>
          {loading ? "…" : "Refresh"}
        </button>
        <button onClick={() => clearToolResult(resultKey)} style={btn("rgba(255,255,255,0.3)")}>
          Clear
        </button>
      </div>
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { background: "none", border: `1px solid ${color}`, color,
    borderRadius: 3, padding: "1px 7px", fontSize: 11, cursor: "pointer" };
}

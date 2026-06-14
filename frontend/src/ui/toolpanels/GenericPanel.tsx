import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useStore } from "../../store";
import { MathDisplay } from "../MathDisplay";
import type { ToolDefinition } from "../../tools/types";
import type { ExpressionEntry } from "../../store";

export interface ToolPanelProps {
  entry: ExpressionEntry;
  def: ToolDefinition;
}

const label: React.CSSProperties = { color: "rgba(255,255,255,0.4)", fontSize: 11, minWidth: 90 };
const value: React.CSSProperties = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
const row:   React.CSSProperties = { display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 };

function formatValue(v: unknown, precision?: number): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length === 0 ? "none" : v.map(x => formatValue(x, precision)).join(", ");
  if (typeof v === "number") {
    if (!isFinite(v)) return "undefined";
    return precision != null ? v.toPrecision(precision) : String(v);
  }
  return String(v);
}

export function GenericPanel({ entry, def }: ToolPanelProps) {
  const runTool        = useStore(s => s.runTool);
  const clearToolResult = useStore(s => s.clearToolResult);
  const toolResults    = useStore(s => s.toolResults);

  const [loading, setLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [inputs, setInputs]   = useState<Record<string, unknown>>(() =>
    Object.fromEntries(def.inputs.map(i => [i.name, i.default ?? ""]))
  );

  const resultKey = `${def.id}:${entry.id}`;
  const result    = toolResults[resultKey];

  const isAutoRun = def.inputs.length === 0;

  const doRun = async () => {
    setLoading(true);
    await runTool(def.id, inputs, entry.id);
    setLoading(false);
  };

  // Keyed on (tool, expression) so a reused panel auto-runs again for a new
  // expression instead of being stuck behind a one-shot boolean (BUG-12).
  const autoRanKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAutoRun) return;
    const key = `${def.id}:${entry.id}`;
    if (autoRanKeyRef.current !== key && !result) {
      autoRanKeyRef.current = key;
      void doRun();
    }
  }, [isAutoRun, def.id, entry.id, result]);

  const panelOutputs = def.outputs.panel ?? [];

  return (
    <div>
      {def.inputs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {def.inputs.map(inp => (
            <label key={inp.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={label}>{inp.label ?? inp.name}</span>
              <input
                type={inp.type === "number" ? "number" : "text"}
                value={String(inputs[inp.name] ?? "")}
                onChange={e => setInputs(prev => {
                  const raw = e.target.value;
                  if (inp.type !== "number") return { ...prev, [inp.name]: raw };
                  // Empty field → keep raw "" (treated as default downstream) rather
                  // than storing NaN, which serializes to JSON null (BUG-7).
                  if (raw === "") return { ...prev, [inp.name]: inp.default ?? "" };
                  const n = parseFloat(raw);
                  return { ...prev, [inp.name]: Number.isNaN(n) ? (inp.default ?? "") : n };
                })}
                style={{
                  width: 64, background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3,
                  color: "#e8e8e8", fontFamily: "monospace", fontSize: 12,
                  padding: "1px 4px", outline: "none",
                }}
              />
            </label>
          ))}
          <button onClick={doRun} disabled={loading} style={btnStyle("#61acff")}>
            {loading ? "…" : "Run"}
          </button>
          {result && (
            <button onClick={() => clearToolResult(resultKey)} style={btnStyle("rgba(255,255,255,0.3)")}>
              Clear
            </button>
          )}
        </div>
      )}

      {result?.error && (
        <div style={{ color: "#ff6b6b", fontSize: 11, marginBottom: 6 }}>{result.error}</div>
      )}

      {result?.ok && panelOutputs.map((spec, i) => {
        if (spec.type === "value") {
          const parts = (spec.value ?? "").replace(/^result\./, "").split(".");
          let resolved: unknown = result.data;
          for (const p of parts) resolved = (resolved as Record<string, unknown>)?.[p];
          return (
            <div key={i} style={row}>
              <span style={label}>{spec.label}</span>
              <span style={value}>{formatValue(resolved, spec.precision)}</span>
            </div>
          );
        }
        if (spec.type === "latex") {
          const parts = (spec.value ?? "").replace(/^result\./, "").split(".");
          let resolved: unknown = result.data;
          for (const p of parts) resolved = (resolved as Record<string, unknown>)?.[p];
          return (
            <div key={i} style={{ ...row, alignItems: "center" }}>
              {spec.label && <span style={label}>{spec.label}</span>}
              <MathDisplay
                latex={String(resolved ?? "")}
                displayMode={spec.displayMode ?? false}
                style={{ fontSize: spec.displayMode ? 15 : 13 }}
              />
            </div>
          );
        }
        if (spec.type === "table") {
          const rows = (result.data.rows as { x: number; y: number }[]) ?? [];
          return (
            <table key={i} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 4 }}>
              <thead>
                <tr>
                  <th style={{ ...label, padding: "2px 8px", textAlign: "left" }}>x</th>
                  <th style={{ ...label, padding: "2px 8px", textAlign: "right" }}>f(x)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.x}>
                    <td style={{ ...value, padding: "1px 8px", textAlign: "left" }}>{r.x}</td>
                    <td style={{ ...value, padding: "1px 8px", textAlign: "right" }}>
                      {isFinite(r.y) ? r.y.toPrecision(5) : <span style={{ color: "rgba(255,255,255,0.3)" }}>undef</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return null;
      })}

      {def.docs && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setShowDocs(v => !v)}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.25)",
              fontSize: 10, cursor: "pointer", padding: 0, letterSpacing: "0.05em",
            }}
          >
            {showDocs ? "▲ hide docs" : "▼ docs"}
          </button>
          {showDocs && (
            <div style={{
              marginTop: 6, padding: "8px 10px",
              background: "rgba(255,255,255,0.03)", borderRadius: 4,
              borderLeft: "2px solid rgba(255,255,255,0.1)",
              fontSize: 11, color: "rgba(255,255,255,0.5)",
              fontFamily: "system-ui, sans-serif", lineHeight: 1.6,
            }}>
              <ReactMarkdown
                disallowedElements={["script", "iframe", "object", "embed", "form", "input", "button"]}
                unwrapDisallowed
                urlTransform={safeUrl}
              >{def.docs}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Allow only safe link schemes in plugin-supplied markdown; drop javascript:,
// data:, vbscript:, etc. so `[x](javascript:...)` cannot execute (SEC-6).
function safeUrl(url: string): string {
  const u = url.trim();
  if (/^(https?:|mailto:|#|\/|\.)/i.test(u)) return u;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // relative / no scheme
  return "";
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: "none", border: `1px solid ${color}`, color,
    borderRadius: 3, padding: "1px 7px", fontSize: 11, cursor: "pointer",
  };
}

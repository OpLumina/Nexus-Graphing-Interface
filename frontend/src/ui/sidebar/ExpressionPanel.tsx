import { useStore } from "../../store";
import { ExpressionRow } from "./ExpressionRow";
import { Slider } from "./Slider";

export function ExpressionPanel() {
  const expressions   = useStore(s => s.expressions);
  const sliders       = useStore(s => s.sliders);
  const addExpression = useStore(s => s.addExpression);

  return (
    <div style={{
      width: 320, minWidth: 240, maxWidth: 480,
      height: "100%", display: "flex", flexDirection: "column",
      background: "#1e1e1e", borderRight: "1px solid rgba(255,255,255,0.08)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
        letterSpacing: "0.05em", userSelect: "none",
      }}>
        NEXUSGRAPH
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {expressions.map((e, i) => (
          <ExpressionRow key={e.id} entry={e} index={i} />
        ))}

        <button
          onClick={addExpression}
          style={{
            width: "100%", padding: "10px 16px", background: "none",
            border: "none", borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.3)", cursor: "pointer",
            textAlign: "left", fontSize: 13,
          }}
        >
          + Add expression
        </button>
      </div>

      {sliders.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0" }}>
          <div style={{
            padding: "4px 16px 8px", fontSize: 11,
            color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em",
          }}>
            PARAMETERS
          </div>
          {sliders.map(s => <Slider key={s.name} slider={s} />)}
        </div>
      )}
    </div>
  );
}

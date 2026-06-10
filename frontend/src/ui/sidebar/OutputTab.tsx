import { toolsForType } from "../../tools/loader";
import { getPanelComponent } from "../toolpanels/registry";
import type { ExpressionEntry } from "../../store";

interface Props {
  entry: ExpressionEntry;
}

const panelWrap: React.CSSProperties = {
  background: "rgba(0,0,0,0.22)",
  borderTop: "1px solid rgba(255,255,255,0.05)",
  padding: "8px 14px",
  fontSize: 12,
};

const divider: React.CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
  margin: "8px 0",
};

export function OutputTab({ entry }: Props) {
  const tools = toolsForType(entry.parsed.type);
  if (tools.length === 0) return null;

  return (
    <div style={panelWrap}>
      {tools.map((def, i) => {
        const Panel = getPanelComponent(def.id);
        return (
          <div key={def.id}>
            {i > 0 && <div style={divider} />}
            <Panel entry={entry} def={def} />
          </div>
        );
      })}
    </div>
  );
}

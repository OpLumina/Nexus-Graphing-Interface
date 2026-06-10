import { useState } from "react";
import { SliderEntry, useStore } from "../../store";

interface Props { slider: SliderEntry }

export function Slider({ slider }: Props) {
  const setSliderValue = useStore(s => s.setSliderValue);
  const setSliderRange = useStore(s => s.setSliderRange);
  const [editingValue, setEditingValue] = useState(false);
  const [tempValue, setTempValue]       = useState("");

  const commitValue = () => {
    const v = parseFloat(tempValue);
    if (isFinite(v)) setSliderValue(slider.name, v);
    setEditingValue(false);
  };

  return (
    <div style={{ padding: "4px 16px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: "monospace", fontSize: 13, color: "#e8e8e8", minWidth: 40 }}>
          {slider.name}
        </span>
        {editingValue ? (
          <input
            autoFocus
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={e => {
              if (e.key === "Enter")  commitValue();
              if (e.key === "Escape") setEditingValue(false);
            }}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#e8e8e8", fontFamily: "monospace", fontSize: 13,
              width: 80, padding: "1px 4px", borderRadius: 3,
            }}
          />
        ) : (
          <span
            onClick={() => { setEditingValue(true); setTempValue(String(slider.value)); }}
            style={{ fontFamily: "monospace", fontSize: 13, color: "#61acff", cursor: "text", minWidth: 60 }}
          >
            {slider.value.toPrecision(4)}
          </span>
        )}
      </div>

      <input
        type="range"
        min={slider.min} max={slider.max} step={slider.step}
        value={slider.value}
        onChange={e => setSliderValue(slider.name, parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#61acff" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
        <span
          contentEditable suppressContentEditableWarning
          onBlur={e => {
            const v = parseFloat(e.currentTarget.textContent ?? "");
            if (isFinite(v)) setSliderRange(slider.name, v, slider.max);
          }}
          style={{ cursor: "text", outline: "none" }}
        >
          {slider.min}
        </span>
        <span
          contentEditable suppressContentEditableWarning
          onBlur={e => {
            const v = parseFloat(e.currentTarget.textContent ?? "");
            if (isFinite(v)) setSliderRange(slider.name, slider.min, v);
          }}
          style={{ cursor: "text", outline: "none" }}
        >
          {slider.max}
        </span>
      </div>
    </div>
  );
}

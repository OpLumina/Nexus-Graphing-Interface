import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { ExpressionEntry, useStore } from "../../store";
import { OutputTab } from "./OutputTab";
import { toolsForType } from "../../tools/loader";
import { MathDisplay } from "../MathDisplay";
import { toLatex } from "../../engine/toLatex";

function toHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return color;
}

interface Props {
  entry: ExpressionEntry;
  index: number;
}

export function ExpressionRow({ entry, index }: Props) {
  const updateExpression = useStore(s => s.updateExpression);
  const removeExpression = useStore(s => s.removeExpression);
  const toggleVisibility = useStore(s => s.toggleVisibility);
  const toggleOutput     = useStore(s => s.toggleOutput);
  const toggleGlobal     = useStore(s => s.toggleGlobal);
  const setColor         = useStore(s => s.setColor);
  const addExpression    = useStore(s => s.addExpression);
  const inputRef     = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (entry.raw === "" && inputRef.current) {
      inputRef.current.focus();
      setFocused(true);
    }
  }, [entry.id]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")                        addExpression();
    if (e.key === "Backspace" && entry.raw === "") removeExpression(entry.id);
    if (e.key === "Escape")                        inputRef.current?.blur();
  };

  const canShowOutput = toolsForType(entry.parsed.type).length > 0;
  const isFunctionDef = entry.parsed.type === "function";

  const showMathPreview = !focused && entry.raw !== "" && entry.error === null;
  const latex = showMathPreview ? toLatex(entry.parsed) : "";

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}>
        <button
          onClick={() => toggleVisibility(entry.id)}
          onContextMenu={e => { e.preventDefault(); colorInputRef.current?.click(); }}
          title={entry.visible ? "Hide (right-click to change color)" : "Show (right-click to change color)"}
          style={{
            width: 12, height: 12, borderRadius: "50%", border: "none",
            background: entry.visible ? entry.color : "rgba(255,255,255,0.15)",
            outline: entry.visible ? "none" : `2px solid ${entry.color}`,
            outlineOffset: 1,
            cursor: "pointer", flexShrink: 0,
          }}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={toHex(entry.color)}
          onChange={e => setColor(entry.id, e.target.value)}
          style={{ display: "none" }}
        />

        <input
          ref={inputRef}
          value={entry.raw}
          onChange={e => updateExpression(entry.id, e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Expression ${index + 1}`}
          spellCheck={false}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: entry.error ? "#ff6b6b" : "#e8e8e8",
            fontFamily: "monospace", fontSize: 14,
            caretColor: entry.color,
            display: showMathPreview ? "none" : "block",
          }}
        />

        {showMathPreview && (
          <div
            onClick={() => { setFocused(true); inputRef.current?.focus(); }}
            style={{
              flex: 1, cursor: "text", minHeight: 20,
              display: "flex", alignItems: "center",
              overflow: "hidden",
            }}
          >
            <MathDisplay
              latex={latex}
              style={{ fontSize: 14, color: entry.color }}
            />
          </div>
        )}

        {canShowOutput && (
          <button
            onClick={() => toggleOutput(entry.id)}
            title={entry.showOutput ? "Hide output" : "Show output"}
            style={{
              background: "none", border: "none",
              color: entry.showOutput ? entry.color : "rgba(255,255,255,0.25)",
              cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px",
            }}
          >
            ≡
          </button>
        )}

        {isFunctionDef && entry.error === null && (
          <button
            onClick={() => toggleGlobal(entry.id)}
            title={entry.isGlobal ? "Global (shared with all expressions)" : "Mark as global"}
            style={{
              background: entry.isGlobal ? entry.color + "33" : "none",
              border: `1px solid ${entry.isGlobal ? entry.color : "rgba(255,255,255,0.15)"}`,
              borderRadius: 3,
              color: entry.isGlobal ? entry.color : "rgba(255,255,255,0.3)",
              cursor: "pointer", fontSize: 9, lineHeight: 1,
              padding: "2px 4px", fontFamily: "monospace", flexShrink: 0,
            }}
          >
            {entry.isGlobal ? "GLO" : "glo"}
          </button>
        )}

        {(entry.parsed.type === "function" || entry.parsed.type === "assignment") && entry.error === null && (
          <span
            title={
              entry.parsed.type === "function"
                ? `${entry.parsed.name}() is available in other expressions`
                : `${entry.parsed.name} is available in other expressions`
            }
            style={{
              fontSize: 10, padding: "1px 5px", borderRadius: 3,
              background: entry.color + "22",
              border: `1px solid ${entry.color}66`,
              color: entry.color,
              fontFamily: "monospace",
              flexShrink: 0,
              fontStyle: entry.isGlobal ? "italic" : "normal",
            }}
          >
            {entry.parsed.type === "function"
              ? `${entry.parsed.name}()`
              : entry.parsed.name}
          </span>
        )}

        <button
          onClick={() => removeExpression(entry.id)}
          title="Remove"
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.2)",
            cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {entry.error && entry.raw !== "" && (
        <div style={{
          background: "#2a1515", color: "#ff6b6b",
          fontSize: 11, padding: "2px 12px",
        }}>
          {entry.error}
        </div>
      )}

      {entry.showOutput && <OutputTab entry={entry} />}
    </div>
  );
}

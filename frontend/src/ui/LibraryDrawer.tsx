import { useState, useEffect } from "react";
import { useStore } from "../store";
import { serialise, deserialise } from "../project";

const LS_KEY = "nexusgraph.saves";

interface SaveFile {
  name: string;
  mtime: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaveAs: () => void;
}

function relativeTime(mtime: number): string {
  const diff = Date.now() - mtime;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function cleanName(name: string): string {
  return name.replace(/\.(ngraph|ngp)$/, "");
}

function lsListSaves(): SaveFile[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as SaveFile[];
  } catch { return []; }
}

function lsQuickSave(content: string): string {
  const ts   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `graph-${ts}.ngraph`;
  const list = lsListSaves();
  list.unshift({ name, mtime: Date.now() });
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  localStorage.setItem(`nexusgraph.save.${name}`, content);
  return name;
}

function lsLoadSave(name: string): string {
  return localStorage.getItem(`nexusgraph.save.${name}`) ?? "";
}

export function LibraryDrawer({ open, onClose, onSaveAs }: Props) {
  const expressions = useStore(s => s.expressions);
  const sliders     = useStore(s => s.sliders);
  const viewport    = useStore(s => s.viewport);

  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    if (window.electronAPI?.listSaves) {
      setSaves(await window.electronAPI.listSaves());
    } else {
      setSaves(lsListSaves());
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const handleQuickSave = async () => {
    const content = serialise({ expressions, sliders, viewport });
    let name: string | null = null;
    if (window.electronAPI?.quickSave) {
      name = await window.electronAPI.quickSave(content);
    } else {
      name = lsQuickSave(content);
    }
    if (name) {
      setToast(`Saved: ${name}`);
      setTimeout(() => setToast(null), 2500);
      await refresh();
    }
  };

  const handleLoad = async (name: string) => {
    let content: string;
    if (window.electronAPI?.loadSave) {
      content = await window.electronAPI.loadSave(name);
    } else {
      content = lsLoadSave(name);
    }
    const data = deserialise(content);
    if (!data) { alert("Could not read file"); return; }
    const store = useStore.getState();
    data.expressions.forEach(e => {
      store.addExpression();
      const added = useStore.getState().expressions.at(-1)!;
      store.updateExpression(added.id, e.raw);
    });
    store.setViewport(data.viewport);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 36, left: 0, right: 0, zIndex: 20,
      background: "rgba(18,18,18,0.97)", borderBottom: "1px solid rgba(255,255,255,0.1)",
      backdropFilter: "blur(8px)", maxHeight: "40vh", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
          LIBRARY
        </span>
        <div style={{ flex: 1 }} />
        {toast && (
          <span style={{ fontSize: 11, color: "#61acff" }}>{toast}</span>
        )}
        <LibBtn label="Quick Save" onClick={handleQuickSave} color="#61acff" />
        <LibBtn label="Save As…"   onClick={onSaveAs}        color="rgba(255,255,255,0.4)" />
        <LibBtn label="✕"          onClick={onClose}         color="rgba(255,255,255,0.3)" />
      </div>

      <div style={{
        overflowY: "auto", flex: 1, padding: "8px 16px",
        display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start",
      }}>
        {saves.length === 0 ? (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", padding: "8px 0" }}>
            No saved graphs yet — click Quick Save to save the current graph.
          </span>
        ) : (
          saves.map(f => (
            <button
              key={f.name}
              onClick={() => void handleLoad(f.name)}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, padding: "6px 12px", cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 2, minWidth: 140,
              }}
            >
              <span style={{ fontSize: 12, color: "#e8e8e8", fontFamily: "monospace" }}>
                {cleanName(f.name)}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                {relativeTime(f.mtime)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function LibBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: `1px solid ${color}`, color,
        borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

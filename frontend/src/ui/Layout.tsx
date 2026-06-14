import { useState, useEffect, useRef } from "react";
import { ExpressionPanel } from "./sidebar/ExpressionPanel";
import { GraphCanvas } from "./GraphCanvas";
import { CommandPalette } from "./CommandPalette";
import { Marketplace } from "./Marketplace";
import { LibraryDrawer } from "./LibraryDrawer";
import { FunctionPalette } from "./FunctionPalette";
import { useStore } from "../store";
import { serialise, deserialise } from "../project";

declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (args: { defaultPath: string; content: string }) => Promise<string | null>;
      exportFile: (args: { defaultPath: string; content: string; encoding: "utf-8" | "base64" }) => Promise<string | null>;
      listSaves: () => Promise<{ name: string; mtime: number }[]>;
      quickSave: (content: string) => Promise<string | null>;
      loadSave: (name: string) => Promise<string>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
  }
}

const DRAG: React.CSSProperties    = { WebkitAppRegion: "drag" }    as React.CSSProperties;
const NO_DRAG: React.CSSProperties = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

function loadProjectIntoStore(content: string) {
  const data = deserialise(content);
  if (!data) { alert("Could not read file"); return; }
  useStore.getState().loadProject(data);
}

export function Layout() {
  const [paletteOpen, setPaletteOpen]         = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [libraryOpen, setLibraryOpen]         = useState(false);
  const expressions   = useStore(s => s.expressions);
  const sliders       = useStore(s => s.sliders);
  const viewport      = useStore(s => s.viewport);
  const addExpression = useStore(s => s.addExpression);
  const undo          = useStore(s => s.undo);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.shiftKey && e.key === "P") { e.preventDefault(); setPaletteOpen(p => !p); return; }
      if (e.shiftKey && e.key === "L") { e.preventDefault(); setLibraryOpen(v => !v); return; }
      if (!e.shiftKey) {
        if (e.key === "s") { e.preventDefault(); void handleSave(); return; }
        if (e.key === "o") { e.preventDefault(); void handleOpen(); return; }
        if (e.key === "z") {
          const active = document.activeElement;
          if (active?.tagName !== "INPUT" && active?.tagName !== "TEXTAREA") {
            e.preventDefault();
            undo();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  useEffect(() => {
    if (expressions.length === 0) addExpression();
  }, []);

  const handleOpen = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (result) loadProjectIntoStore(result.content);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSave = async () => {
    const content = serialise({ expressions, sliders, viewport });
    if (window.electronAPI) {
      await window.electronAPI.saveFile({ defaultPath: "graph.ngraph", content });
    } else {
      const blob = new Blob([content], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "graph.ngraph";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadProjectIntoStore(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ngraph,.ngp"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 36, zIndex: 10,
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
        background: "rgba(18,18,18,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(4px)", ...DRAG,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
          NEXUSGRAPH
        </span>
        <div style={{ flex: 1 }} />
        <TopBtn label="Open"    onClick={handleOpen} />
        <TopBtn label="Library" onClick={() => setLibraryOpen(v => !v)} />
        <TopBtn label="Save"    onClick={handleSave} />
        <TopBtn label="Plugins" onClick={() => setMarketplaceOpen(true)} />
        <TopBtn label="Menu" onClick={() => setPaletteOpen(true)} minWidth={46} />
        {window.electronAPI && <WinControls />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", paddingTop: 36 }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <ExpressionPanel />
          <GraphCanvas />
        </div>
        <FunctionPalette />
      </div>

      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSaveAs={handleSave}
      />
      {paletteOpen     && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {marketplaceOpen && <Marketplace   onClose={() => setMarketplaceOpen(false)} />}
    </div>
  );
}

function TopBtn({ label, onClick, minWidth }: { label: string; onClick: () => void; minWidth?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.5)", padding: "2px 10px", borderRadius: 4,
        fontSize: 11, cursor: "pointer", minWidth: minWidth ?? "auto",
        textAlign: "center", whiteSpace: "nowrap",
        ...NO_DRAG,
      }}
    >
      {label}
    </button>
  );
}

function WinControls() {
  const btn = (label: string, color: string, hoverColor: string, onClick: () => void) => (
    <WinCtrlBtn key={label} label={label} color={color} hoverColor={hoverColor} onClick={onClick} />
  );
  return (
    <div style={{ display: "flex", gap: 6, marginLeft: 8, alignItems: "center" }}>
      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", marginRight: 2 }} />
      {btn("─", "rgba(255,255,255,0.35)", "#fbbf24", () => window.electronAPI?.minimizeWindow())}
      {btn("⛶", "rgba(255,255,255,0.35)", "#34d399", () => window.electronAPI?.maximizeWindow())}
      {btn("✕", "rgba(255,255,255,0.35)", "#f87171", () => window.electronAPI?.closeWindow())}
    </div>
  );
}

function WinCtrlBtn({ label, color, hoverColor, onClick }: {
  label: string; color: string; hoverColor: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.08)" : "none",
        border: "none",
        color: hovered ? hoverColor : color,
        width: 28, height: 22, borderRadius: 4,
        fontSize: label === "✕" ? 11 : 13,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "color 0.1s, background 0.1s",
        padding: 0,
        lineHeight: 1, ...NO_DRAG,
      }}
    >
      {label}
    </button>
  );
}

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
    };
  }
}

function loadProjectIntoStore(content: string) {
  const data = deserialise(content);
  if (!data) { alert("Could not read file"); return; }
  const store = useStore.getState();
  data.expressions.forEach(e => {
    store.addExpression();
    const added = useStore.getState().expressions.at(-1)!;
    store.updateExpression(added.id, e.raw);
  });
  store.setViewport(data.viewport);
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
        backdropFilter: "blur(4px)",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
          NEXUSGRAPH
        </span>
        <div style={{ flex: 1 }} />
        <TopBtn label="Open"    onClick={handleOpen} />
        <TopBtn label="Library" onClick={() => setLibraryOpen(v => !v)} />
        <TopBtn label="Save"    onClick={handleSave} />
        <TopBtn label="Plugins" onClick={() => setMarketplaceOpen(true)} />
        <TopBtn label="⌘⇧P"    onClick={() => setPaletteOpen(true)} />
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

function TopBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.5)", padding: "2px 10px", borderRadius: 4,
        fontSize: 11, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

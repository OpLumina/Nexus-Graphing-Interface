import { useState, useEffect, useRef } from "react";
import {
  fetchRegistry, fetchAndInstallPlugin, installFromFile, installBundled,
  loadInstalledPlugins, uninstallPlugin, setPluginEnabled,
  getRegistryUrl, setRegistryUrl,
} from "../plugins/manager";
import type { MarketplaceEntry, InstalledPlugin } from "../plugins/types";

interface Props { onClose: () => void }

type Tab = "browse" | "installed" | "import";

const TAG_COLORS: Record<string, string> = {
  calculus: "#61acff", series: "#6be08e", "signal processing": "#cc73ff",
  complex: "#ffc935", visualization: "#ff8c33", "differential equations": "#ff6b6b",
  dynamics: "#38e0e0", statistics: "#ff74c8", data: "#61acff",
  integration: "#6be08e", geometry: "#ffc935", numeric: "#38e0e0",
  algebra: "#cc73ff", analysis: "#ff8c33", utility: "#9aa7b8",
};

function Tag({ label }: { label: string }) {
  const color = TAG_COLORS[label] ?? "rgba(255,255,255,0.3)";
  return (
    <span style={{
      fontSize: 10, padding: "1px 6px", borderRadius: 10,
      background: color + "22", border: `1px solid ${color}55`, color,
    }}>
      {label}
    </span>
  );
}

export function Marketplace({ onClose }: Props) {
  const [tab, setTab]               = useState<Tab>("browse");
  const [registry, setRegistry]     = useState<MarketplaceEntry[]>([]);
  const [installed, setInstalled]   = useState<InstalledPlugin[]>([]);
  const [search, setSearch]         = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [status, setStatus]         = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [urlInput, setUrlInput]     = useState("");
  const [regInput, setRegInput]     = useState(getRegistryUrl());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRegistry().then(r => setRegistry(r.plugins));
    setInstalled(loadInstalledPlugins());
  }, []);

  const refresh = () => setInstalled(loadInstalledPlugins());

  const isInstalled = (id: string) => installed.some(p => p.manifest.id === id);

  const doInstallBundled = (id: string) => {
    setInstalling(id);
    const res = installBundled(id);
    setStatus({ id, msg: res.ok ? `Installed "${res.name}" — reload to activate` : (res.error ?? "Failed"), ok: res.ok });
    refresh();
    setInstalling(null);
  };

  const doInstallUrl = async (url: string) => {
    if (!url.trim()) return;
    setInstalling(url);
    const res = await fetchAndInstallPlugin(url.trim());
    setStatus({ id: url, msg: res.ok ? `Installed "${res.name}" — restart to activate` : (res.error ?? "Failed"), ok: res.ok ?? false });
    refresh();
    setInstalling(null);
  };

  const doInstallFile = async (file: File) => {
    const res = await installFromFile(file);
    setStatus({ id: file.name, msg: res.ok ? `Installed "${res.name}" — restart to activate` : (res.error ?? "Failed"), ok: res.ok ?? false });
    refresh();
  };

  const doUninstall = (id: string) => {
    uninstallPlugin(id);
    refresh();
  };

  const doToggle = (id: string, enabled: boolean) => {
    setPluginEnabled(id, enabled);
    refresh();
  };

  const filtered = registry.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.includes(search.toLowerCase()))
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#1e1e1e", borderRadius: 10, width: 640, maxHeight: "80vh",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e8e8" }}>Plugin Marketplace</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                Extend NexusGraph with community tools
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {(["browse", "installed", "import"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 14px", fontSize: 12,
                color: tab === t ? "#61acff" : "rgba(255,255,255,0.4)",
                borderBottom: tab === t ? "2px solid #61acff" : "2px solid transparent",
                textTransform: "capitalize",
              }}>
                {t}{t === "installed" && installed.length > 0 ? ` (${installed.length})` : ""}
              </button>
            ))}
          </div>
        </div>

        {status && (
          <div style={{ padding: "8px 20px", background: status.ok ? "rgba(107,224,142,0.1)" : "rgba(255,107,107,0.1)",
            borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12,
            color: status.ok ? "#6be08e" : "#ff6b6b", display: "flex", justifyContent: "space-between" }}>
            {status.msg}
            <button onClick={() => setStatus(null)} style={{ background: "none", border: "none",
              color: "inherit", cursor: "pointer", fontSize: 11 }}>dismiss</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "browse" && (
            <div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search plugins…"
                style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 5, color: "#e8e8e8", padding: "7px 10px", fontSize: 13, outline: "none",
                  marginBottom: 14, boxSizing: "border-box" }}
              />
              {filtered.length === 0 && (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: 24 }}>
                  No plugins found
                </div>
              )}
              {filtered.map(p => (
                <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 7,
                  padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8" }}>{p.name}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>v{p.version}</span>
                        {p.requiresBackend && (
                          <span style={{ fontSize: 10, color: "#ffc935", background: "#ffc93518",
                            border: "1px solid #ffc93540", borderRadius: 3, padding: "0 4px" }}>
                            needs backend
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                        {p.description}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.tags.map(t => <Tag key={t} label={t} />)}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>
                        by {p.author}
                      </div>
                    </div>
                    <div style={{ marginLeft: 12 }}>
                      {isInstalled(p.id) ? (
                        <span style={{ fontSize: 11, color: "#6be08e", padding: "3px 8px",
                          background: "rgba(107,224,142,0.1)", borderRadius: 4, border: "1px solid rgba(107,224,142,0.3)" }}>
                          ✓ Installed
                        </span>
                      ) : (
                        <button
                          onClick={() => p.url ? doInstallUrl(p.url) : doInstallBundled(p.id)}
                          disabled={installing === p.id}
                          style={{ background: "#61acff18", border: "1px solid #61acff55", color: "#61acff",
                            borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                          {installing === p.id ? "Installing…" : "Install"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "installed" && (
            <div>
              {installed.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: 32 }}>
                  No plugins installed. Browse the marketplace or import from a file.
                </div>
              ) : installed.map(p => (
                <div key={p.manifest.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 7,
                  padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)",
                  opacity: p.enabled ? 1 : 0.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8e8", marginBottom: 2 }}>
                        {p.manifest.name}
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>
                          v{p.manifest.version}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        {p.manifest.tools.length} tool{p.manifest.tools.length !== 1 ? "s" : ""}
                        {" · "}by {p.manifest.author}
                        {" · "}<span style={{ color: "rgba(255,255,255,0.25)" }}>{p.source}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => doToggle(p.manifest.id, !p.enabled)}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.5)", borderRadius: 4, padding: "2px 8px",
                          fontSize: 11, cursor: "pointer" }}>
                        {p.enabled ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => doUninstall(p.manifest.id)}
                        style={{ background: "none", border: "1px solid rgba(255,107,107,0.4)",
                          color: "#ff6b6b", borderRadius: 4, padding: "2px 8px",
                          fontSize: 11, cursor: "pointer" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "import" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  Install from URL
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/my-plugin.ngplugin.json"
                    style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 5, color: "#e8e8e8", padding: "7px 10px", fontSize: 12, outline: "none" }}
                  />
                  <button onClick={() => doInstallUrl(urlInput)}
                    style={{ background: "#61acff18", border: "1px solid #61acff55", color: "#61acff",
                      borderRadius: 5, padding: "0 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Install
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  Install from file
                </div>
                <input ref={fileRef} type="file" accept=".json,.ngplugin.json"
                  style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) doInstallFile(e.target.files[0]); }} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#e8e8e8", borderRadius: 5, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
                  Choose .ngplugin.json file…
                </button>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  Registry URL <span style={{ color: "rgba(255,255,255,0.25)" }}>(advanced)</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={regInput}
                    onChange={e => setRegInput(e.target.value)}
                    placeholder="https://your-registry.com/registry.json"
                    style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 5, color: "#e8e8e8", padding: "7px 10px", fontSize: 12, outline: "none" }}
                  />
                  <button onClick={() => { setRegistryUrl(regInput); fetchRegistry().then(r => setRegistry(r.plugins)); }}
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                      color: "#e8e8e8", borderRadius: 5, padding: "0 14px", fontSize: 12, cursor: "pointer" }}>
                    Save
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                  Point to any hosted registry.json to use a custom or private plugin feed.
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6,
                padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 12, color: "#61acff", marginBottom: 8 }}>Creating a plugin</div>
                <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0,
                  lineHeight: 1.6, overflowX: "auto" }}>{PLUGIN_TEMPLATE}</pre>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 11, color: "rgba(255,255,255,0.25)", display: "flex", justifyContent: "space-between" }}>
          <span>Plugins take effect after reload  ·  NexusGraph Plugin API v1</span>
          <span>{installed.filter(p => p.enabled).length} active</span>
        </div>
      </div>
    </div>
  );
}

const PLUGIN_TEMPLATE = `{
  "id": "your-name.plugin-name",
  "version": "1.0.0",
  "name": "My Tool",
  "author": "Your Name",
  "description": "What this plugin does",
  "tags": ["calculus"],
  "tools": [{
    "id": "my_tool",
    "label": "My Tool",
    "description": "...",
    "category": "calculus",
    "appliesTo": ["function", "expression"],
    "inputs": [
      { "name": "n", "type": "number", "label": "N", "default": 5 }
    ],
    "operation": {
      "type": "inline",
      "js": "function run(inputs, ctx) {\\n  // ctx.env, ctx.viewport, ctx.userFns\\n  // Math and utils available\\n  return { ok: true, data: { result: inputs.n * 2 } };\\n}"
    },
    "outputs": {
      "panel": [{ "type": "value", "label": "result", "value": "result.result" }]
    }
  }]
}`;

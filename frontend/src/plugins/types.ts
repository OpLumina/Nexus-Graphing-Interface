// Plugin system types.
// A plugin is a single .ngplugin.json file — self-contained, no build step required.

import type { ToolInputSpec, ToolOutputPanelSpec, ToolOutputOverlaySpec } from "../tools/types";

// ── Plugin manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  /** Globally unique ID. Convention: "author.plugin-name" */
  id: string;
  version: string;
  name: string;
  author: string;
  description: string;
  tags?: string[];
  homepage?: string;
  license?: string;
  /** If true, this plugin requires a Python backend with matching backend.py installed. */
  requiresBackend?: boolean;
  tools: PluginToolDef[];
}

// ── Tool definition embedded in a plugin ─────────────────────────────────────

export interface PluginToolDef {
  id: string;
  label: string;
  description: string;
  category: string;
  appliesTo: string[];
  inputs: ToolInputSpec[];
  operation: PluginOperationSpec;
  outputs: {
    overlays?: ToolOutputOverlaySpec[];
    panel?: ToolOutputPanelSpec[];
  };
  docs?: string;
}

export type PluginOperationSpec =
  | {
      type: "inline";
      /** JS function body. Receives (inputs, ctx) → ToolResult or Promise<ToolResult>.
       *  Available globals: Math, inputs, ctx.
       *  ctx = { env, userFns, viewport, expressions, exprId }
       *  Must return: { ok: boolean, data: Record<string, unknown>, overlays?: OverlayLine[] }
       *
       *  BP-4: may be a single string OR an array of source lines (joined with
       *  "\n") so the code stays reviewable in the JSON instead of one escaped
       *  line. Normalized to a string before execution. */
      js: string | string[];
      /** BP-4: optional `sha256-<base64>` digest over the resolved js source.
       *  When present, the loader rejects the plugin on mismatch. */
      integrity?: string;
    }
  | {
      type: "backend";
      op: string;
      args?: Record<string, string>;
    };

// ── Installed plugin record (persisted in localStorage) ──────────────────────

export interface InstalledPlugin {
  manifest: PluginManifest;
  installedAt: string;      // ISO date string
  enabled: boolean;
  source: "marketplace" | "url" | "file";
  sourceUrl?: string;
}

// ── Marketplace registry (fetched from a remote URL) ─────────────────────────

export interface MarketplaceEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  url: string;              // URL to the .ngplugin.json file
  requiresBackend: boolean;
  downloads?: number;
  updatedAt?: string;
}

export interface MarketplaceRegistry {
  version: number;
  updated: string;
  plugins: MarketplaceEntry[];
}

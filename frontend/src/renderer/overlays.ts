import type { Viewport } from "./viewport";

export interface OverlayLine {
  x0: number;
  y0: number;
  slope: number;
  color: string;
  label?: string;
  style?: "solid" | "dashed";
}

export function sampleLine(
  x0: number,
  y0: number,
  slope: number,
  viewport: Viewport,
  steps = 100,
): Float32Array {
  const pts: number[] = [];
  const { xMin, xMax } = viewport;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = slope * (x - x0) + y0;
    pts.push(x, y);
  }
  return new Float32Array(pts);
}

const WHITE: [number, number, number] = [1, 1, 1];

// Clamp to the normalized [0,1] range WebGL color uniforms expect. NaN stays
// NaN (Math.max/min propagate it) so the finite-check still rejects it.
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

// Parse "#rgb", "#rrggbb", or "rgb()/rgba()" into normalized [r,g,b] plus alpha.
// Any unparseable input falls back to opaque white instead of emitting NaN
// channels that silently corrupt WebGL color uniforms (BUG-2).
export function parseColor(color: string): { rgb: [number, number, number]; alpha: number } {
  if (typeof color !== "string") return { rgb: WHITE, alpha: 1 };
  const c = color.trim();

  const rgbaMatch = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgbaMatch) {
    const r = clamp01(Number(rgbaMatch[1]) / 255);
    const g = clamp01(Number(rgbaMatch[2]) / 255);
    const b = clamp01(Number(rgbaMatch[3]) / 255);
    const a = clamp01(rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1);
    if ([r, g, b, a].every(Number.isFinite)) return { rgb: [r, g, b], alpha: a };
    return { rgb: WHITE, alpha: 1 };
  }

  let h = c.replace("#", "");
  if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
  if (h.length === 6 && /^[0-9a-f]{6}$/i.test(h)) {
    return {
      rgb: [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ],
      alpha: 1,
    };
  }
  return { rgb: WHITE, alpha: 1 };
}

export function hexToRgb(hex: string): [number, number, number] {
  return parseColor(hex).rgb;
}

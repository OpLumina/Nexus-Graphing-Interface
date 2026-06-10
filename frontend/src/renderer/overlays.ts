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

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

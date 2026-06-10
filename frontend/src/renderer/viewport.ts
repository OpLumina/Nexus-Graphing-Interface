export interface ViewportState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type Viewport = ViewportState;

export function defaultViewport(): ViewportState {
  return { xMin: -10, xMax: 10, yMin: -7, yMax: 7 };
}

export function viewportWidth(v: ViewportState): number {
  return v.xMax - v.xMin;
}

export function viewportHeight(v: ViewportState): number {
  return v.yMax - v.yMin;
}

export function pixelToMath(
  px: number,
  py: number,
  v: ViewportState,
  canvasW: number,
  canvasH: number,
): [number, number] {
  const x = v.xMin + (px / canvasW) * viewportWidth(v);
  const y = v.yMax - (py / canvasH) * viewportHeight(v);
  return [x, y];
}

export function mathToClip(
  mx: number,
  my: number,
  v: ViewportState,
): [number, number] {
  const cx = ((mx - v.xMin) / viewportWidth(v)) * 2 - 1;
  const cy = ((my - v.yMin) / viewportHeight(v)) * 2 - 1;
  return [cx, cy];
}

export function pan(v: ViewportState, dx: number, dy: number): ViewportState {
  return {
    xMin: v.xMin - dx,
    xMax: v.xMax - dx,
    yMin: v.yMin - dy,
    yMax: v.yMax - dy,
  };
}

export function panByPixels(
  v: ViewportState,
  dpx: number,
  dpy: number,
  canvasW: number,
  canvasH: number,
): ViewportState {
  const dx = (dpx / canvasW) * viewportWidth(v);
  const dy = (dpy / canvasH) * viewportHeight(v);
  return pan(v, dx, -dy);
}

export function zoomAt(v: ViewportState, mx: number, my: number, factor: number): ViewportState {
  return {
    xMin: mx + (v.xMin - mx) * factor,
    xMax: mx + (v.xMax - mx) * factor,
    yMin: my + (v.yMin - my) * factor,
    yMax: my + (v.yMax - my) * factor,
  };
}

export function zoomAtPixel(
  v: ViewportState,
  px: number,
  py: number,
  factor: number,
  canvasW: number,
  canvasH: number,
): ViewportState {
  const [mx, my] = pixelToMath(px, py, v, canvasW, canvasH);
  return zoomAt(v, mx, my, factor);
}

export function fitAspect(v: ViewportState, canvasW: number, canvasH: number): ViewportState {
  const mathW = viewportWidth(v);
  const mathH = (canvasH / canvasW) * mathW;
  const cy = (v.yMin + v.yMax) / 2;
  return { ...v, yMin: cy - mathH / 2, yMax: cy + mathH / 2 };
}
